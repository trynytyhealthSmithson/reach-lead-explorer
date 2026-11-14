"""
Participant linkage between ACO REACH and the Medicare Shared Savings Program (MSSP).

The join key is the participant legal business name (par_lbn) exactly as CMS reports it
in each program's public participant file. It is NOT a TIN, NPI, CCN or any other
identifier: neither public file publishes one. See PARTICIPANT_LINKAGE.md for the method,
its limits and the validation checks.

Inputs (DataPipe/raw/linkage/, not committed because of size; URLs in PARTICIPANT_LINKAGE.md):
  REACH_PRVDR_PY2021.csv to REACH_PRVDR_PY2024.csv   ACO REACH Providers PUF
  MSSP_PART_PY2021.csv   to MSSP_PART_PY2024.csv     MSSP ACO Participants file
Outputs (DataPipe/linkage/):
  participant_matches.csv   one row per matched organization, REACH ACO, MSSP ACO and year pair
  aco_pairs.csv             REACH ACO and MSSP ACO pairs with the count of shared organizations
  linkage_summary.json      counts and validation checks
Run: python3 DataPipe/participant_linkage.py
"""
import json, os, re, warnings
import pandas as pd

warnings.filterwarnings('ignore')
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'raw', 'linkage')
OUT = os.path.join(HERE, 'linkage')
YEARS = [2021, 2022, 2023, 2024]

# Exact match after only two cosmetic steps: upper case and collapsed whitespace.
# Punctuation, suffixes (LLC, INC, PC) and word order are kept exactly as published.
def name_key(s):
    return re.sub(r'\s+', ' ', str(s).strip().upper())

# The REACH file reports an individual clinician's own name in par_lbn for most rows.
# Only rows whose name reads as an organization are linked; person names are excluded
# because common names (for example JAMES LEE) collide across unrelated clinicians.
ORG_WORDS = (r'\b(?:LLC|L\.L\.C\.?|INC\.?|CORP\.?|CORPORATION|P\.?C\.?|P\.?A\.?|PLLC|LLP|LP|LTD|COMPANY|'
             r'GROUP|HEALTH|HEALTHCARE|HOSPITAL|MEDICAL|MEDICINE|CENTER|CENTRE|CLINIC|CLINICS|ASSOCIATES|'
             r'PHYSICIANS|CARE|SERVICES|SYSTEM|UNIVERSITY|FOUNDATION|PARTNERS|NETWORK|PRACTICE|COUNTY|'
             r'INSTITUTE|SC|S\.C\.)\b')


def load():
    reach = pd.concat([pd.read_csv(os.path.join(RAW, f'REACH_PRVDR_PY{y}.csv'), dtype=str, encoding='utf-8-sig')
                       .rename(columns=str.lower) for y in YEARS])
    mssp = pd.concat([pd.read_csv(os.path.join(RAW, f'MSSP_PART_PY{y}.csv'), dtype=str, encoding='utf-8-sig',
                                  encoding_errors='replace').rename(columns=str.lower).assign(perf_year=str(y))
                      for y in YEARS])
    for d in (reach, mssp):
        d['name_key'] = d.par_lbn.map(name_key)
        d['org_named'] = d.name_key.str.contains(ORG_WORDS, regex=True)
    return reach, mssp


def main():
    os.makedirs(OUT, exist_ok=True)
    reach, mssp = load()
    part = reach[reach.prvdr_class == 'PART']

    r = (reach[reach.org_named].groupby(['name_key', 'perf_year', 'prvdr_class', 'aco_id'])
         .size().reset_index(name='reach_provider_rows'))
    m = mssp[mssp.org_named][['name_key', 'perf_year', 'aco_id']].drop_duplicates()
    matches = r.merge(m, on='name_key', suffixes=('_reach', '_mssp'))

    # A name used by two or more MSSP ACOs in the same year is likely shared by unrelated
    # organizations, so it is flagged and left out of the ACO-level rollup.
    ambiguous = set(mssp.groupby(['name_key', 'perf_year']).aco_id.nunique().loc[lambda s: s > 1]
                    .reset_index().name_key)
    matches['ambiguous_name'] = matches.name_key.isin(ambiguous)
    matches['same_year'] = matches.perf_year_reach == matches.perf_year_mssp
    matches.to_csv(os.path.join(OUT, 'participant_matches.csv'), index=False)

    reach_name = reach.drop_duplicates('aco_id', keep='last').set_index('aco_id').aco_name
    mssp_name = mssp.drop_duplicates('aco_id', keep='last').set_index('aco_id').aco_name
    pm = matches[(matches.prvdr_class == 'PART') & ~matches.ambiguous_name]
    pairs = (pm.groupby(['aco_id_reach', 'aco_id_mssp']).name_key.nunique().reset_index(name='shared_organizations')
             .sort_values('shared_organizations', ascending=False))
    pairs['reach_aco_name'] = pairs.aco_id_reach.map(reach_name)
    pairs['mssp_aco_name'] = pairs.aco_id_mssp.map(mssp_name)
    pairs.to_csv(os.path.join(OUT, 'aco_pairs.csv'), index=False)

    # Validation: CMS overlap rules bar a REACH Participant Provider from an MSSP ACO in the
    # same year, so a credible key should produce almost no same-year Participant matches.
    pi = part[~part.org_named][['name_key', 'perf_year']].drop_duplicates()
    mi = mssp[~mssp.org_named][['name_key', 'perf_year']].drop_duplicates()
    allp = matches[matches.prvdr_class == 'PART']
    first_m = allp.groupby('name_key').perf_year_mssp.min()
    first_r = allp.groupby('name_key').perf_year_reach.min()
    orgs_per_aco = part[part.org_named].groupby('aco_id').name_key.nunique()
    share = (pm.groupby('aco_id_reach').name_key.nunique() / orgs_per_aco).dropna()
    summary = {
        'join_key': 'participant legal business name as reported by CMS (par_lbn), upper case and collapsed whitespace only',
        'reach_participant_rows': int(len(part)),
        'reach_participant_rows_org_named_pct': round(100 * part.org_named.mean(), 1),
        'reach_org_named_participant_organizations': int(part[part.org_named].name_key.nunique()),
        'mssp_org_named_participant_organizations': int(mssp[mssp.org_named].name_key.nunique()),
        'participant_organizations_in_both_programs': int(allp.name_key.nunique()),
        'ambiguous_names_excluded': int(allp[allp.ambiguous_name].name_key.nunique()),
        'in_mssp_before_reach': int((first_m < first_r).sum()),
        'in_reach_before_mssp': int((first_m > first_r).sum()),
        'check_same_year_participant_matches_org_named': int(allp[allp.same_year].name_key.nunique()),
        'check_same_year_collisions_if_person_names_were_used': int(len(pi.merge(mi, on=['name_key', 'perf_year']))),
        'preferred_provider_organizations_also_mssp_same_year': int(
            matches[(matches.prvdr_class == 'PREF') & matches.same_year].name_key.nunique()),
        'reach_acos_with_org_participants': int(len(orgs_per_aco)),
        'reach_acos_with_any_org_participant_from_mssp': int(pm.aco_id_reach.nunique()),
        'reach_acos_25pct_or_more_org_participants_from_mssp': int((share >= .25).sum()),
        'reach_acos_50pct_or_more_org_participants_from_mssp': int((share >= .5).sum()),
    }
    with open(os.path.join(OUT, 'linkage_summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    main()

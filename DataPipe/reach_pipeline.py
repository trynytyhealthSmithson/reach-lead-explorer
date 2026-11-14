"""
reach_pipeline.py: ACO REACH Financial and Quality Results PUF -> app JSON.

Reads one CMS PUF CSV per performance year from DataPipe/raw/ and writes:
  public/data/reach_performance.json   one record per ACO-year
  src/data/reach_performance.json      (same)
  src/data/reach_program_trends.json   year-level aggregates
  src/data/reach_aco_list.json         one record per ACO (latest name)
  src/data/reach_config_matrix.json    performance by configuration, by year

Scaling conventions (kept identical to the earlier export):
  sav_rate, discount, perc_dual, perc_lti  -> percent (decimal x 100)
  qual_scr                                 -> percent; PY2021 file already stores "100%"
  retention_withhold                       -> percent (most rows publish 2; a few publish 0.02)
Everything else is stored as published. Blank, '.', '*', 'N/A', 'NR', '---' -> null.

Usage: python3 DataPipe/reach_pipeline.py      (run from the repo root)
"""
import csv, json, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(HERE, 'raw')

FILES = {
    2021: 'PY1_EXPND_FNCL_QLTY_PUF_REDACT_UPDATE.csv',
    2022: 'PY2_FNCL_QLTY_CORE_EXP_PUF_REDACT_FINAL 2022_Ha Edits 04_18_2025.csv',
    2023: 'py3_fncl_qltypuf_rdx.csv',
    2024: 'py4_fncl_qlty_core_exp_puf_redact_02MAR26.csv',
}
MONTHS = {2021: 9}            # PY2021 ran April to December
NULLS = {'', '.', '*', 'N/A', 'NA', 'NR', '---', '--', 'nan', 'None'}

PCT_FIELDS = {'SAV_RATE', 'DISCOUNT', 'PERC_DUAL', 'PERC_LTI', 'CAHPS_SCR'}

# app key -> CMS column (default is key.upper())
COLS = {
    'capitation': 'CAPITATION_ARRANGEMENT', 'enhanced_pcc': 'ENHANCED_PCC_ELECTION',
    'stop_loss': 'STOP_LOSS_ELECTION', 'cap_pmt': 'CAP_PMT_AMT', 'epcc_pmt': 'EPCC_PMT_AMT',
    'clm_pmt': 'CLM_PMT_AMT', 'heba_dn_mnths': 'HEBA_DOWN_MNTHS', 'heba_down_amt': 'HEBA_DOWN_AMT',
}
STR_FIELDS = ['aco_id', 'aco_name', 'aco_type', 'risk_arrangement', 'capitation', 'enhanced_pcc',
              'apo_election', 'alignment_plus', 'stop_loss']
NUM_FIELDS = [
    'first_part_year', 'discount', 'retention_withhold', 'sav_rate', 'final_benchmark', 'unadj_benchmark',
    'tot_cost_care', 'tot_cost_care_net', 'gross_savings', 'shared_savings', 'shared_savings_seq',
    'cap_pmt', 'epcc_pmt', 'clm_pmt', 'heba_up_amt', 'heba_down_amt', 'heba_up_mnths', 'heba_dn_mnths',
    'hdr_adjust', 'norm_risk_score', 'cif_cap_risk',
    'expnd_inp_all', 'expnd_inp_s_trm', 'expnd_inp_l_trm', 'expnd_inp_rehab', 'expnd_inp_psych',
    'expnd_opd', 'expnd_pb', 'expnd_snf', 'expnd_hha', 'expnd_hsp', 'expnd_dme', 'expnd_ambupay',
    'bene_cnt', 'n_ben_age_0_64', 'n_ben_age_65_74', 'n_ben_age_75_84', 'n_ben_age_85plus',
    'n_ben_male', 'n_ben_female', 'n_ben_race_white', 'n_ben_race_black', 'n_ben_race_asian',
    'n_ben_race_hisp', 'n_ben_race_native', 'n_ben_race_pi', 'n_ben_race_other', 'perc_dual', 'perc_lti',
    'n_pcp', 'n_spec', 'n_np', 'n_pa', 'n_hosp', 'n_fqhc', 'n_cah', 'n_rhc',
    'adm_n', 'adm_s_trm_n', 'adm_l_trm_n', 'adm_rehab_n', 'adm_psych_n',
    'p_edv_vis', 'p_edv_vis_hosp', 'p_snf_adm', 'snf_los', 'snf_payperstay', 'p_em_total',
    'p_em_pcp_vis', 'p_em_sp_vis', 'p_ct_vis', 'p_mri_vis', 'p_nurse_vis', 'p_fqhc_rhc_vis',
    'qual_scr', 'acr_scr', 'uamcc_scr', 'dah_scr', 'tfu_scr',
    'ssm_taci', 'ssm_com', 'ssm_cc', 'ssm_sdm', 'ssm_pr', 'ssm_chos', 'ssm_hpe', 'ssm_spr',
    'cahps_scr',
]
FLAG_FIELDS = ['cisep_flag', 'hpp_flag']


# PY2024 renamed two fields: HEBA is published as the Population Adjustment (PA_*),
# and the HEDR quality adjustment as the Data Reporting adjustment (DR_ADJUST).
RENAMED = {
    'heba_up_amt': 'PA_UP_AMT', 'heba_down_amt': 'PA_DOWN_AMT',
    'heba_up_mnths': 'PA_UP_MNTHS', 'heba_dn_mnths': 'PA_DOWN_MNTHS',
    'hdr_adjust': 'DR_ADJUST',
}


def col_for(key, year, header):
    default = COLS.get(key, key.upper())
    if default not in header and key in RENAMED and RENAMED[key] in header:
        return RENAMED[key]
    if key.startswith('ssm_'):
        return key.upper() + '_SCR'
    if key == 'cahps_scr':
        return 'CAHPS_SCR'
    if key == 'acr_scr' and 'ACR_SCR' not in header and 'ACH_SCR' in header:
        return 'ACH_SCR'
    if key == 'bene_cnt' and 'BENE_CNT' not in header and 'ALIGNED_BENEFICIARIES' in header:
        return 'ALIGNED_BENEFICIARIES'
    return COLS.get(key, key.upper())


def num(raw, col, year):
    s = (raw or '').strip()
    if s in NULLS:
        return None
    pct_sign = s.endswith('%')
    s = s.replace('%', '').replace(',', '').replace('$', '').strip()
    try:
        v = float(s)
    except ValueError:
        return None
    if col == 'QUAL_SCR':
        return round(v if (pct_sign or v > 1.0) else v * 100, 1)
    if col in PCT_FIELDS and not pct_sign:
        v = v * 100
    if col == 'RETENTION_WITHHOLD' and 0 < v < 1:   # a few rows are published as 0.02 instead of 2
        v = v * 100
    return round(v, 6)


def yes_no(raw):
    s = (raw or '').strip()
    if s in NULLS:
        return None
    s = s.title()
    return {'Y': 'Yes', 'N': 'No'}.get(s, s)


def read_year(year):
    path = os.path.join(RAW, FILES[year])
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        rows = list(csv.DictReader(f))
    header = set(rows[0].keys())
    out = []
    for r in rows:
        rec = {'perf_year': year}
        for k in STR_FIELDS:
            v = (r.get(col_for(k, year, header)) or '').strip()
            if k in ('aco_type', 'risk_arrangement'):
                v = v.title()
            elif k in ('enhanced_pcc', 'apo_election', 'alignment_plus', 'stop_loss'):
                v = yes_no(v)
            elif k == 'capitation':
                v = v.upper() or None
            rec[k] = v
        for k in NUM_FIELDS:
            c = col_for(k, year, header)
            rec[k] = num(r.get(c), c, year) if c in header else None
        for k in FLAG_FIELDS:
            c = k.upper()
            rec[k] = yes_no(r.get(c)) if c in header else None
        rec['config_key'] = f"{rec['risk_arrangement']}/{rec['capitation']}"
        rec['config_full'] = f"{rec['config_key']}/ePCC:{rec['enhanced_pcc']}/SL:{rec['stop_loss']}"
        out.append(rec)
    return out


def mean(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def build_trends(recs, years):
    out = []
    for y in years:
        yr = [r for r in recs if r['perf_year'] == y]
        months = MONTHS.get(y, 12)
        bench = sum(r['final_benchmark'] or 0 for r in yr)
        cost = sum(r['tot_cost_care'] or 0 for r in yr)
        shared = sum(r['shared_savings'] or 0 for r in yr)
        benes = int(sum(r['bene_cnt'] or 0 for r in yr))
        savers = sum(1 for r in yr if (r['sav_rate'] or 0) > 0)
        cp = {}
        for key in sorted({r['config_key'] for r in yr}, key=lambda k: -sum(r['config_key'] == k for r in yr)):
            g = [r for r in yr if r['config_key'] == key]
            cp[key] = {
                'count': len(g),
                'avg_sav': round(mean([r['sav_rate'] for r in g]), 2),
                'pct_sav': round(sum((r['sav_rate'] or 0) > 0 for r in g) / len(g) * 100, 1),
                'total_shared_M': round(sum(r['shared_savings'] or 0 for r in g) / 1e6, 1),
                'total_benes': int(sum(r['bene_cnt'] or 0 for r in g)),
            }
        # CMS reports program results against the benchmark before the Global discount
        # (gross savings = net savings to CMS + net savings to ACOs). Rebuild that basis from the PUF.
        bench_pre = sum((r['final_benchmark'] or 0) / (1 - (r['discount'] or 0) / 100)
                        + (r['heba_up_amt'] or 0) + (r['heba_down_amt'] or 0) for r in yr)
        gross_cms = bench_pre - cost
        heba_up = [r['heba_up_amt'] for r in yr if r['heba_up_amt'] is not None]
        heba_dn = [r['heba_down_amt'] for r in yr if r['heba_down_amt'] is not None]
        out.append({
            'year': y, 'months': months, 'n_acos': len(yr), 'n_savers': savers,
            'pct_savers': round(savers / len(yr) * 100, 1),
            'prog_sav_rate': round((bench - cost) / bench * 100, 3) if bench else None,
            'avg_sav_rate': round(mean([r['sav_rate'] for r in yr]), 4),
            'total_shared_savings': round(shared / 1e6, 1),
            'shared_pbpm': round(shared / benes / months, 2) if benes else None,
            'shared_perbene': round(shared / benes, 2) if benes else None,
            'total_benchmark': round(bench / 1e6, 1),
            'total_benes': benes,
            'avg_qual_scr': round(mean([r['qual_scr'] for r in yr]), 2),
            'avg_acr_scr': round(mean([r['acr_scr'] for r in yr]), 4),
            'avg_uamcc_scr': round(mean([r['uamcc_scr'] for r in yr]), 4),
            'n_global': sum(r['risk_arrangement'] == 'Global' for r in yr),
            'n_professional': sum(r['risk_arrangement'] == 'Professional' for r in yr),
            'n_standard': sum(r['aco_type'] == 'Standard' for r in yr),
            'n_new_entrant': sum(r['aco_type'] == 'New Entrant' for r in yr),
            'n_high_needs': sum(r['aco_type'] == 'High Needs' for r in yr),
            'n_global_tcc': sum(r['config_key'] == 'Global/TCC' for r in yr),
            'n_global_pcc': sum(r['config_key'] == 'Global/PCC' for r in yr),
            'n_prof_pcc': sum(r['config_key'] == 'Professional/PCC' for r in yr),
            'n_epcc_yes': sum(r['enhanced_pcc'] == 'Yes' for r in yr),
            'n_apo_yes': sum(r['apo_election'] == 'Yes' for r in yr),
            'n_hpp_yes': sum(r['hpp_flag'] == 'Yes' for r in yr),
            'n_cisep_yes': sum(r['cisep_flag'] == 'Yes' for r in yr),
            'config_perf': cp,
            'cms_basis_benchmark_M': round(bench_pre / 1e6, 1),
            'cms_basis_gross_M': round(gross_cms / 1e6, 1),
            'cms_basis_gross_rate': round(gross_cms / bench_pre * 100, 2) if bench_pre else None,
            'cms_basis_medicare_M': round((gross_cms - shared) / 1e6, 1),
            'cms_basis_gross_pbpm': round(gross_cms / benes / months, 2) if benes else None,
            'heba_up_total': round(sum(heba_up) / 1e6, 1) if heba_up else None,
            'heba_dn_total': round(sum(heba_dn) / 1e6, 1) if heba_dn else None,
        })
    return out


def build_aco_list(recs):
    by = defaultdict(list)
    for r in recs:
        by[r['aco_id']].append(r)
    out = []
    for aid, rs in by.items():
        rs.sort(key=lambda r: r['perf_year'])
        latest = rs[-1]
        out.append({
            'aco_id': aid, 'aco_name': latest['aco_name'], 'aco_type': latest['aco_type'],
            'first_part_year': rs[0]['first_part_year'],
            'years': [r['perf_year'] for r in rs],
            'config_keys': sorted({r['config_key'] for r in rs}),
            'years_count': len(rs), 'most_recent_year': latest['perf_year'],
        })
    return sorted(out, key=lambda x: x['aco_name'])


def build_matrix(recs, years):
    keys = sorted({(r['risk_arrangement'], r['capitation'], r['enhanced_pcc'], r['stop_loss']) for r in recs})
    out = []
    for risk, cap, epcc, sl in keys:
        row = {'risk': risk, 'cap': cap, 'enhanced_pcc': epcc, 'stop_loss': sl, 'key': f'{risk}|{cap}|{epcc}|{sl}'}
        for y in years:
            g = [r for r in recs if r['perf_year'] == y and (r['risk_arrangement'], r['capitation'], r['enhanced_pcc'], r['stop_loss']) == (risk, cap, epcc, sl)]
            if not g:
                continue
            row[f'py{y}_count'] = len(g)
            row[f'py{y}_avg_sav'] = round(mean([r['sav_rate'] for r in g]), 2)
            row[f'py{y}_pct_sav'] = float(round(sum((r['sav_rate'] or 0) > 0 for r in g) / len(g) * 100))
            row[f'py{y}_total_shared_M'] = round(sum(r['shared_savings'] or 0 for r in g) / 1e6, 1)
        out.append(row)
    return out


def main():
    recs, years = [], []
    for y in sorted(FILES):
        rows = read_year(y)
        if rows is None:
            print(f'PY{y}: file not found, skipped')
            continue
        recs += rows
        years.append(y)
        print(f'PY{y}: {len(rows)} ACOs')
    perf = {'records': recs, 'years': years, 'total': len(recs)}
    for p in ('public/data', 'src/data'):
        with open(os.path.join(ROOT, p, 'reach_performance.json'), 'w') as f:
            json.dump(perf, f, separators=(',', ':'))
    with open(os.path.join(ROOT, 'src/data/reach_program_trends.json'), 'w') as f:
        json.dump(build_trends(recs, years), f, indent=2)
    with open(os.path.join(ROOT, 'src/data/reach_aco_list.json'), 'w') as f:
        json.dump(build_aco_list(recs), f, separators=(',', ':'))
    with open(os.path.join(ROOT, 'src/data/reach_config_matrix.json'), 'w') as f:
        json.dump(build_matrix(recs, years), f, separators=(',', ':'))
    for p in ('public/data',):
        for n in ('reach_program_trends.json', 'reach_aco_list.json', 'reach_config_matrix.json'):
            with open(os.path.join(ROOT, 'src/data', n)) as s, open(os.path.join(ROOT, p, n), 'w') as d:
                d.write(s.read())
    print(f'{len(recs)} ACO-year records, years {years}')


if __name__ == '__main__':
    main()

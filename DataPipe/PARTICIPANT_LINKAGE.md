# Participant Linkage Between ACO REACH and MSSP

## What the join uses

Organizations are linked across the two programs by **the participant legal business name exactly as CMS reports it** in each program's public participant file. The join does **not** use a Tax Identification Number (TIN), National Provider Identifier (NPI), CMS Certification Number (CCN) or any other identifier, because neither public file publishes one. TIN and NPI level MSSP data exists only in a restricted CMS research file that requires a data use agreement.

Before comparing, each name gets only two cosmetic changes: it is converted to upper case, and repeated spaces are collapsed to one. Punctuation, suffixes such as LLC, INC or PC, and word order are left exactly as published. There is no fuzzy or partial matching, so "Family Medicine Associates PA" and "Family Medicine Associates, P.A." are treated as different names.

The join links participant organizations, not ACOs. ACO names are never compared.

## Source files

All files come from data.cms.gov and cover performance years 2021 through 2024.

| File | Rows | Key field | Download |
|---|---|---|---|
| ACO REACH Providers PUF, PY 2021 | 19,518 | `par_lbn` | https://data.cms.gov/sites/default/files/2023-05/PROVIDER_PUF.csv |
| ACO REACH Providers PUF, PY 2022 | 92,675 | `par_lbn` | https://data.cms.gov/sites/default/files/2025-04/2c5d0dce-4c4c-44ae-a211-6c777871960e/py2_PRVDR_PUF.csv |
| ACO REACH Providers PUF, PY 2023 | 191,493 | `par_lbn` | https://data.cms.gov/sites/default/files/2025-04/3ab682d1-76c9-4c87-ab2e-1410db74f843/py3_prvdr_puf.csv |
| ACO REACH Providers PUF, PY 2024 | 234,886 | `par_lbn` | https://data.cms.gov/sites/default/files/2026-07/695b301a-ce48-4ae5-a40c-1555cbbd1d8f/ACO_REACH_PY2024_PRVDR_PUF.csv |
| MSSP ACO Participants, PY 2021 | 16,352 | `Par_LBN` | https://data.cms.gov/sites/default/files/2021-11/d3640f80-8b36-4ae2-acf3-b1eced28b314/SSP_ACO_Participants_2021_01_01.csv |
| MSSP ACO Participants, PY 2022 | 16,046 | `par_lbn` | https://data.cms.gov/sites/default/files/2022-01/048c24ac-89f8-4ca4-8fd0-a5ed32dcb9b2/SSP_ACO_Participants_2022_01_01.csv |
| MSSP ACO Participants, PY 2023 | 15,551 | `par_lbn` | https://data.cms.gov/sites/default/files/2023-01/95509a9d-0344-4a5d-9cbb-3adcedbe191f/SSP_ACO_Participants_2023_01_01.csv |
| MSSP ACO Participants, PY 2024 | 15,540 | `par_lbn` | https://data.cms.gov/sites/default/files/2024-01/afc09855-5e4b-4baf-bdc4-88a4459a52e5/PY2024_Medicare_Shared_Savings_Program_Participants.csv |

To rerun, save the files to `DataPipe/raw/linkage/` as `REACH_PRVDR_PY{year}.csv` and `MSSP_PART_PY{year}.csv`, then run `python3 DataPipe/participant_linkage.py`.

## Which rows can be linked

The REACH Providers file has one row per provider. For individual clinicians, the `par_lbn` field usually holds the clinician's own name (for example "JAMES LEE") rather than the name of the organization they bill through. Only 2.5% of REACH Participant Provider rows carry an organization name.

Person names are **excluded** from the join. Common names repeat across unrelated clinicians, so matching on them would link people who have nothing to do with each other. A name is treated as an organization when it contains a word such as LLC, INC, PC, PA, GROUP, HEALTH, HOSPITAL, MEDICAL, CENTER, CLINIC, ASSOCIATES, PHYSICIANS, PARTNERS or NETWORK. The full list is `ORG_WORDS` in the script.

A name that two or more MSSP ACOs list in the same year is flagged as ambiguous and left out of the ACO-level results, because it is probably shared by unrelated organizations. Six names were flagged.

## Validation

CMS rules do not allow a REACH Participant Provider to take part in an MSSP ACO in the same year. A credible key should therefore produce almost no same-year matches for Participant Providers.

| Check | Result |
|---|---|
| Organization names that match in the same year (Participant Providers) | 5 of 934 matched organizations, all generic names such as "Family Medicine Associates PA" |
| Person names that would match in the same year if they were used | 248, which breaks the overlap rule and confirms person names are not usable |
| Preferred Provider organizations also in MSSP in the same year | 160, as expected, since Preferred Providers are allowed to be in both |

## Results, PY 2021 to 2024

| Measure | Count |
|---|---|
| REACH organization-named participant organizations | 2,874 |
| MSSP organization-named participant organizations | 19,724 |
| Participant organizations found in both programs | 934 |
| In MSSP before their first REACH year | 819 |
| In REACH before their first MSSP year | 115 |
| REACH ACOs with organization-named participants | 118 |
| REACH ACOs with at least one participant organization also in MSSP | 81 |
| REACH ACOs where 25% or more of their participant organizations were also in MSSP | 54 |
| REACH ACOs where 50% or more were also in MSSP | 26 |

## Limits

- **Names, not identifiers.** Two different organizations with the same legal name would be linked, and one organization reported under two spellings would not. The same-year check suggests few false links, but it cannot rule out every one.
- **Organizations only.** Clinicians reported under their own names, about 97.5% of REACH Participant Provider rows, are not linked. Results describe organizations (groups, health centers, hospitals), not headcount.
- **Four years of MSSP history.** Only MSSP participant files for 2021 to 2024 are loaded, so "in MSSP before REACH" does not see MSSP participation before 2021.
- **Before-and-after uses each organization's first year in each file.** It does not track every move in and out.

## Outputs

- `linkage/participant_matches.csv`: one row per matched organization, REACH ACO, MSSP ACO and year pair, with `same_year` and `ambiguous_name` flags.
- `linkage/aco_pairs.csv`: REACH and MSSP ACO pairs with the number of shared participant organizations.
- `linkage/linkage_summary.json`: the counts and checks above.

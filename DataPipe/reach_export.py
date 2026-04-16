"""
reach_export.py — ACO REACH PUF data pipeline
Reads PY2021, PY2022, PY2023 CSVs and outputs three JSON files
for the ACO REACH → LEAD Explorer React app.

Normalizations applied:
  - QUAL_SCR: PY2021 stored as "100%" string → 100.0; PY2022/2023 stored as 0-1 decimal → ×100
  - SAV_RATE: stored as decimal across all years → ×100 for display (e.g. 0.051 → 5.1%)
  - ACH_SCR (2021) renamed to ACR_SCR to match 2022/2023
  - ALIGNED_BENEFICIARIES (2021) renamed to BENE_CNT to match 2022/2023
  - ACO_TYPE / RISK_ARRANGEMENT: PY2022 all-caps → title case
  - PERC_DUAL / PERC_LTI: stored as decimal → ×100 for display

Output files (place in React app's public/data/ and src/data/):
  - reach_performance.json  : all 284 ACO-year records (~369 KB)
  - reach_program_trends.json : year-level aggregates for Program Overview
  - reach_aco_list.json     : one record per unique ACO (150 ACOs)

Usage:
  python reach_export.py
  (expects CSV files in subdirectories relative to BASE_DIR)
"""

import pandas as pd
import numpy as np
import json
import os

BASE_DIR = 'ACO REACH Financial and Quality Results'

FILES = {
    2021: f'{BASE_DIR}/2021/PY1_EXPND_FNCL_QLTY_PUF_REDACT_UPDATE.csv',
    2022: f'{BASE_DIR}/2022/PY2_FNCL_QLTY_CORE_EXP_PUF_REDACT_FINAL 2022_Ha Edits 04_18_2025.csv',
    2023: f'{BASE_DIR}/2023/py3_fncl_qltypuf_rdx.csv',
}

OUTPUT_DIR = './data'


def clean_num(val, scale=1.0):
    """Convert to float, return None if not parseable or NaN."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    try:
        v = float(str(val).replace('%', '').replace(',', '').strip())
        return round(v * scale, 6)
    except Exception:
        return None


def clean_qual_scr(val, year):
    """Normalize QUAL_SCR to 0-100 scale across all years."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    s = str(val).replace('%', '').strip()
    try:
        v = float(s)
        # PY2021: stored as "100%" string -> already 0-100 after strip
        # PY2022/2023: stored as 0-1 decimal -> multiply by 100
        return round(v if year == 2021 else v * 100, 1)
    except Exception:
        return None


def process_year(df, year):
    rows = []
    for _, r in df.iterrows():
        row = {
            # Identity
            'aco_id':                 str(r['ACO_ID']),
            'aco_name':               str(r['ACO_NAME']).strip(),
            'aco_type':               str(r['ACO_TYPE']).title().strip(),
            'perf_year':              int(year),
            'first_part_year':        clean_num(r.get('FIRST_PART_YEAR')),
            'risk_arrangement':       str(r['RISK_ARRANGEMENT']).title().strip(),
            'capitation_arrangement': str(r.get('CAPITATION_ARRANGEMENT', '')).strip() or None,
            'stop_loss':              str(r.get('STOP_LOSS_ELECTION', '')).strip() or None,

            # Financial
            'sav_rate':           clean_num(r.get('SAV_RATE'), scale=100.0),
            'final_benchmark':    clean_num(r.get('FINAL_BENCHMARK')),
            'unadj_benchmark':    clean_num(r.get('UNADJ_BENCHMARK')),
            'tot_cost_care':      clean_num(r.get('TOT_COST_CARE')),
            'tot_cost_care_net':  clean_num(r.get('TOT_COST_CARE_NET')),
            'gross_savings':      clean_num(r.get('GROSS_SAVINGS')),
            'shared_savings':     clean_num(r.get('SHARED_SAVINGS')),
            'discount':           clean_num(r.get('DISCOUNT'), scale=100.0),

            # Expenditure by category (raw $)
            'expnd_inp_all':  clean_num(r.get('EXPND_INP_ALL')),
            'expnd_opd':      clean_num(r.get('EXPND_OPD')),
            'expnd_pb':       clean_num(r.get('EXPND_PB')),
            'expnd_snf':      clean_num(r.get('EXPND_SNF')),
            'expnd_hha':      clean_num(r.get('EXPND_HHA')),
            'expnd_hsp':      clean_num(r.get('EXPND_HSP')),
            'expnd_dme':      clean_num(r.get('EXPND_DME')),
            'expnd_ambupay':  clean_num(r.get('EXPND_AMBUPAY')),

            # Beneficiaries (unify 2021 column name)
            'bene_cnt': clean_num(
                r.get('BENE_CNT') if 'BENE_CNT' in r.index else r.get('ALIGNED_BENEFICIARIES')
            ),

            # Demographics
            'n_ben_age_0_64':   clean_num(r.get('N_BEN_AGE_0_64')),
            'n_ben_age_65_74':  clean_num(r.get('N_BEN_AGE_65_74')),
            'n_ben_age_75_84':  clean_num(r.get('N_BEN_AGE_75_84')),
            'n_ben_age_85plus': clean_num(r.get('N_BEN_AGE_85PLUS')),
            'n_ben_male':       clean_num(r.get('N_BEN_MALE')),
            'n_ben_female':     clean_num(r.get('N_BEN_FEMALE')),
            'n_ben_race_white': clean_num(r.get('N_BEN_RACE_WHITE')),
            'n_ben_race_black': clean_num(r.get('N_BEN_RACE_BLACK')),
            'n_ben_race_asian': clean_num(r.get('N_BEN_RACE_ASIAN')),
            'n_ben_race_hisp':  clean_num(r.get('N_BEN_RACE_HISP')),
            'perc_dual':        clean_num(r.get('PERC_DUAL'), scale=100.0),
            'perc_lti':         clean_num(r.get('PERC_LTI'), scale=100.0),

            # Provider counts
            'n_pcp':  clean_num(r.get('N_PCP')),
            'n_spec': clean_num(r.get('N_SPEC')),
            'n_np':   clean_num(r.get('N_NP')),
            'n_pa':   clean_num(r.get('N_PA')),
            'n_hosp': clean_num(r.get('N_HOSP')),
            'n_fqhc': clean_num(r.get('N_FQHC')),
            'n_cah':  clean_num(r.get('N_CAH')),
            'n_rhc':  clean_num(r.get('N_RHC')),

            # Utilization
            'adm_n':          clean_num(r.get('ADM_N')),
            'p_edv_vis':      clean_num(r.get('P_EDV_VIS')),
            'p_edv_vis_hosp': clean_num(r.get('P_EDV_VIS_HOSP')),
            'p_snf_adm':      clean_num(r.get('P_SNF_ADM')),
            'snf_los':        clean_num(r.get('SNF_LOS')),
            'p_em_total':     clean_num(r.get('P_EM_TOTAL')),

            # Quality — ACH_SCR (2021) unified to ACR_SCR
            'qual_scr':  clean_qual_scr(r.get('QUAL_SCR'), year),
            'acr_scr':   clean_num(r.get('ACR_SCR') if year > 2021 else r.get('ACH_SCR')),
            'uamcc_scr': clean_num(r.get('UAMCC_SCR')),
            'dah_scr':   clean_num(r.get('DAH_SCR')),
            'tfu_scr':   clean_num(r.get('TFU_SCR')),   # null in 2021

            # CAHPS SSM scores (2022/2023 only, null in 2021)
            'ssm_taci': clean_num(r.get('SSM_TACI_SCR')),
            'ssm_com':  clean_num(r.get('SSM_COM_SCR')),
            'ssm_cc':   clean_num(r.get('SSM_CC_SCR')),
            'ssm_sdm':  clean_num(r.get('SSM_SDM_SCR')),

            # PY2023-only flags
            'cisep_flag': str(r.get('CISEP_FLAG', '')).strip() or None,
            'hpp_flag':   str(r.get('HPP_FLAG', '')).strip() or None,
        }
        rows.append(row)
    return rows


def build_trends(all_rows):
    trends = []
    for year in [2021, 2022, 2023]:
        yr = [r for r in all_rows if r['perf_year'] == year]

        def avg(key):
            vals = [r[key] for r in yr if r.get(key) is not None]
            return round(sum(vals) / len(vals), 2) if vals else None

        def total(key, scale=1.0):
            vals = [r[key] for r in yr if r.get(key) is not None]
            return round(sum(vals) * scale, 1) if vals else None

        savers = sum(1 for r in yr if r.get('sav_rate') and r['sav_rate'] > 0)
        trends.append({
            'year':                  year,
            'n_acos':                len(yr),
            'n_savers':              savers,
            'pct_savers':            round(savers / len(yr) * 100, 1),
            'avg_sav_rate':          avg('sav_rate'),
            'total_shared_savings':  total('shared_savings', scale=1/1e6),
            'total_benchmark':       total('final_benchmark', scale=1/1e6),
            'total_benes':           int(sum(r['bene_cnt'] for r in yr if r.get('bene_cnt'))),
            'avg_qual_scr':          avg('qual_scr'),
            'avg_acr_scr':           avg('acr_scr'),
            'avg_uamcc_scr':         avg('uamcc_scr'),
            'n_global':              sum(1 for r in yr if r['risk_arrangement'] == 'Global'),
            'n_professional':        sum(1 for r in yr if r['risk_arrangement'] == 'Professional'),
            'n_standard':            sum(1 for r in yr if r['aco_type'] == 'Standard'),
            'n_new_entrant':         sum(1 for r in yr if r['aco_type'] == 'New Entrant'),
            'n_high_needs':          sum(1 for r in yr if r['aco_type'] == 'High Needs'),
        })
    return trends


def build_aco_list(all_rows):
    aco_map = {}
    for r in all_rows:
        aid = r['aco_id']
        if aid not in aco_map:
            aco_map[aid] = {
                'aco_id':          aid,
                'aco_name':        r['aco_name'],
                'aco_type':        r['aco_type'],
                'first_part_year': r['first_part_year'],
                'years':           [],
            }
        aco_map[aid]['years'].append(r['perf_year'])

    aco_list = []
    for aid, info in aco_map.items():
        info['years'] = sorted(info['years'])
        info['years_count'] = len(info['years'])
        info['most_recent_year'] = max(info['years'])
        aco_list.append(info)

    return sorted(aco_list, key=lambda x: x['aco_name'])


if __name__ == '__main__':
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_rows = []
    for year, fpath in FILES.items():
        df = pd.read_csv(fpath)
        rows = process_year(df, year)
        all_rows.extend(rows)
        print(f'PY{year}: {len(rows)} ACOs processed')

    print(f'Total records: {len(all_rows)}')

    # reach_performance.json
    perf_path = f'{OUTPUT_DIR}/reach_performance.json'
    with open(perf_path, 'w') as f:
        json.dump({'records': all_rows, 'years': [2021, 2022, 2023], 'total': len(all_rows)},
                  f, separators=(',', ':'))
    print(f'reach_performance.json: {os.path.getsize(perf_path)/1024:.0f} KB')

    # reach_program_trends.json
    trends = build_trends(all_rows)
    with open(f'{OUTPUT_DIR}/reach_program_trends.json', 'w') as f:
        json.dump(trends, f, separators=(',', ':'), indent=2)
    print('reach_program_trends.json written')

    # reach_aco_list.json
    aco_list = build_aco_list(all_rows)
    with open(f'{OUTPUT_DIR}/reach_aco_list.json', 'w') as f:
        json.dump(aco_list, f, separators=(',', ':'))
    print(f'reach_aco_list.json: {len(aco_list)} unique ACOs')

    print('\nDone.')

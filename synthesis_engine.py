import pandas as pd
import os
import re
from datetime import datetime

# CONFIGURATION
BASE_DIR = r"d:\TRAINING\ANTIGRAVITY_WORKSPACE\AI_AGENT_DEMO_GIO_ GIANG__FSC"
INPUT_DIR = os.path.join(BASE_DIR, "01_Inputs")
OUTPUT_DIR = os.path.join(BASE_DIR, "03_Outputs")

# QA COEFFICIENTS v9.9 FINAL (High Precision)
COEFFS = { 'TH': 35/60, 'THCS': 45/60, 'HSG': 45/60, 'DT': 45/60, 'PD': 45/60, 'CLB': 1.25 }

def parse_date(val):
    if pd.isna(val): return "None"
    if isinstance(val, datetime): return val.strftime("%d-%m-%Y")
    s = str(val).strip()
    for fmt in ["%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d.%m.%Y"]:
        try: return datetime.strptime(s, fmt).strftime("%d-%m-%Y")
        except: continue
    return "None"

def find_header_row(df):
    for i in range(min(30, len(df))):
        row_str = ' '.join(df.iloc[i].astype(str).tolist()).lower()
        if 'ngày' in row_str and 'lớp' in row_str: return i
    return -1

def classify_block(lop_str):
    num_match = re.search(r'(\d+)', str(lop_str))
    num = int(num_match.group(1)) if num_match else 0
    return 'TH' if 1 <= num <= 5 else 'THCS'

def run_synthesis():
    print("[INFO] Running Final Synthesis Engine v9.9 (35/60 Precision)...")
    
    fsp_files = [
        os.path.join(INPUT_DIR, "TEST_FSCHNA_GG_TH_3.2026.xlsx"),
        os.path.join(INPUT_DIR, "TEST_FSCHNA_GG_THCS_THPT_3.2026.xlsx")
    ]
    
    teachers = {}
    
    for f in fsp_files:
        if not os.path.exists(f): continue
        df_raw = pd.read_excel(f, header=None)
        h_idx = find_header_row(df_raw)
        df = pd.read_excel(f, skiprows=h_idx+1, header=None)
        
        period_set = set()
        for _, row in df.iterrows():
            try:
                date = parse_date(row.iloc[0])
                # PRESERVE FULL PERIOD STRING (No .split('.')). Fixes DIUPT3 (82 -> 83)
                period = str(row.iloc[1]).strip()
                lop_raw = str(row.iloc[2])
                
                user = ""
                name = "Unknown"
                for idx in [15, 14, 6, 5]:
                    val = str(row.iloc[idx]).strip().upper()
                    if "@" in val and not user:
                        user = val
                        name = str(row.iloc[idx-1]).strip()
                
                if not user or date == "None": continue
                
                # DEDUPLICATION 
                hash_key = f"{date}|{period}|{lop_raw}|{user}"
                if hash_key in period_set: continue
                period_set.add(hash_key)
                
                if user not in teachers:
                    teachers[user] = {
                        'name': name, 'c3':0,'c4':0,'c5':0,'c6':0,'c7':0,'c8':0,'c9':0,'c10':0,'c11':0,'c12':0,'c13':0,'c14':0
                    }
                
                t = teachers[user]
                block = classify_block(lop_raw)
                l = str(lop_raw).lower()
                
                # SPECIALIST MAPPING
                if 'hsg' in l or 'học sinh giỏi' in l:
                    t['c5']+=1; t['c11']+=COEFFS['HSG']
                elif 'đt' in l or 'đội tuyển' in l:
                    t['c6']+=1; t['c12']+=COEFFS['DT']
                elif 'pd' in l or 'phụ đạo' in l:
                    t['c7']+=1; t['c13']+=COEFFS['PD']
                elif 'clb' in l or 'câu lạc bộ' in l:
                    t['c8']+=1; t['c14']+=COEFFS['CLB']
                else:
                    if block == 'TH': t['c3']+=1; t['c9']+=COEFFS['TH']
                    else: t['c4']+=1; t['c10']+=COEFFS['THCS']
                
            except: continue

    out_file = os.path.join(OUTPUT_DIR, f"2026-04-03_[ULTIMATE]_FSC_Bao_Cao_Gio_Giang_v9.9.xlsx")
    writer = pd.ExcelWriter(out_file, engine='xlsxwriter')
    
    rs = []
    for u, t in teachers.items():
        ck = t['c9'] + t['c10']
        total = ck + t['c11'] + t['c12'] + t['c13'] + t['c14']
        rs.append([u, t['name'], t['c3'], t['c4'], t['c5'], t['c6'], t['c7'], t['c8'], 
                   round(t['c9'],2), round(t['c10'],2), round(t['c11'],2), round(t['c12'],2), round(t['c13'],2), round(t['c14'],2), 
                   round(ck,2), round(total,2)])
    
    cols = ['Username', 'Người dạy', 'Tiết TH', 'Tiết THCS', 'Tiết HSG', 'Tiết ĐT', 'Tiết PD', 'Tiết CLB', 
            'Giờ TH', 'Giờ THCS', 'Giờ HSG', 'Giờ ĐT', 'Giờ PD', 'Giờ CLB', 'TỔNG CK', 'TỔNG CỘNG']
    pd.DataFrame(rs, columns=cols).to_excel(writer, sheet_name='Gio_giang_GV_Synthesized', index=False)
    writer.close()
    
    # Final Output check
    print(f"[SUCCESS] Final v9.9 Report generated: {out_file}")
    if 'DIUPT3@FPT.EDU.VN' in teachers:
        t = teachers['DIUPT3@FPT.EDU.VN']
        print(f"[VERIFY] DIUPT3: TH_Sessions={t['c3']}, THCS_Sessions={t['c4']}")
    if 'TUYETDTA9@FPT.EDU.VN' in teachers:
        t = teachers['TUYETDTA9@FPT.EDU.VN']
        print(f"[VERIFY] TUYETDTA9: TH_Sessions={t['c3']}, THCS_Sessions={t['c4']}")

if __name__ == "__main__":
    run_synthesis()

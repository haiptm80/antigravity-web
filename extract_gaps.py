import pandas as pd
import os
from datetime import datetime

# CONFIGURATION
TIMESTAMP = datetime.now().strftime("%Y-%m-%d")
INPUT_FILE = os.path.join(r"d:\TRAINING\ANTIGRAVITY_WORKSPACE\AI_AGENT_DEMO_GIO_ GIANG__FSC\03_Outputs", f"{TIMESTAMP}_[ULTIMATE]_FSC_Bao_Cao_Gio_Giang_v9.7.xlsx")
OUTPUT_FILE = os.path.join(r"d:\TRAINING\ANTIGRAVITY_WORKSPACE\AI_AGENT_DEMO_GIO_ GIANG__FSC\03_Outputs", f"{TIMESTAMP}_[EXTERNAL]_FSC_Danh_Sach_Khuyet_Toa_Do_FSP_v9.7.xlsx")
LOGO_PATH = r"C:\Users\ABCD\.gemini\antigravity\brain\c964fa3a-39bb-4317-9ac6-8db9422f05d7\fpt_logo_hq_png_1775191207063.png"

def clean_report():
    print(f"[INFO] Extracting and Sanitizing Missing Coordinates from v9.6 Report...")
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] Input file not found: {INPUT_FILE}")
        return

    # Load the Alert sheet
    df = pd.read_excel(INPUT_FILE, sheet_name='Canh_Bao_Sai_Lech')
    
    # 1. Standardize formatting
    df['Ngày'] = df['Ngày'].apply(lambda x: str(x).strip())
    df['Lớp'] = df['Lớp'].apply(lambda x: str(x).strip().upper())
    
    # 2. Add Branding & Sanitized Columns
    # Select target columns
    cols = ['Ngày', 'Tiết', 'Lớp', 'GV dạy thay (Kế hoạch)', 'GV thực tế trên FSP', 'Vấn đề phát hiện']
    df_clean = df[cols].copy()
    df_clean.columns = ['Ngày giảng', 'Tiết', 'Lớp', 'GV Kế hoạch (Thay)', 'GV FSP Hiện tại', 'Ghi chú Audit']
    
    # 3. Export with XlsxWriter
    writer = pd.ExcelWriter(OUTPUT_FILE, engine='xlsxwriter')
    df_clean.to_excel(writer, sheet_name='Danh_sach_khuyet', index=False, startrow=5)
    
    # FORMATTING
    ws = writer.sheets['Danh_sach_khuyet']
    wb = writer.book
    fmt_h = wb.add_format({'bold':True, 'bg_color':'#00529B', 'font_color':'white', 'border':1})
    fmt_title = wb.add_format({'bold':True, 'font_size':14, 'font_color':'#F26F21'})
    fmt_border = wb.add_format({'border':1})
    
    # Header
    if os.path.exists(LOGO_PATH):
        ws.insert_image('A1', LOGO_PATH, {'x_scale':0.1, 'y_scale':0.1})
    
    ws.merge_range('C2:F2', 'FE QA - DANH SÁCH TỌA ĐỘ KHUYẾT FSP (v9.6)', fmt_title)
    ws.write('A5', 'DANH SÁCH RÀ SOÁT CẦN CẬP NHẬT FSP', wb.add_format({'bold':True, 'italic':True}))
    
    # Write Headers manually for styling
    for col_num, value in enumerate(df_clean.columns):
        ws.write(5, col_num, value, fmt_h)
        
    # Apply borders to data rows
    for r in range(len(df_clean)):
        for c in range(len(df_clean.columns)):
            ws.write(r+6, c, df_clean.iloc[r, c], fmt_border)
    
    ws.set_column('A:F', 22)
    writer.close()
    print(f"[SUCCESS] Gap report v9.6 generated: {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_report()

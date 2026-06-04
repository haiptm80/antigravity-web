import pandas as pd
import numpy as np
import re
import os
import glob

# =====================================================================
# FPT QA AGENT v9.0 PERFECT MASTER - VECTORIZATION & O(1) HASH MAP
# =====================================================================

INPUT_DIR = "01_Inputs"
OUTPUT_DIR = "03_Outputs"

def get_loai_gio(lop_str):
    match = re.search(r'\d+', str(lop_str))
    if match:
        num = int(match.group())
        if 1 <= num <= 5: return "TH"
        if 6 <= num <= 12: return "THCS/THPT"
    return "UNKNOWN"

def clean_tiet(tiet_raw):
    """Chuẩn hóa tiết học (VD: 1.0 -> '1', ' 2 ' -> '2')"""
    return str(tiet_raw).split('.')[0].strip()

def main():
    print("🚀 [INFO] Khởi động Pipeline V9.0 Perfect Master...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # ---------------------------------------------------------
    # BƯỚC 1: ĐỌC VÀ LÀM SẠCH DỮ LIỆU FSP
    # ---------------------------------------------------------
    all_files = glob.glob(os.path.join(INPUT_DIR, "FSCHNA_GG_*.xlsx"))
    if not all_files:
        print("❌ [ERROR] Không tìm thấy file dữ liệu FSP nào.")
        return
    
    df = pd.concat([pd.read_excel(f) for f in all_files], ignore_index=True)
    
    # Chuẩn hóa đồng nhất định dạng
    df['Username'] = df['Username'].astype(str).str.strip().str.upper()
    df['Ngày'] = pd.to_datetime(df['Ngày'], errors='coerce').dt.normalize()
    df['Tiết'] = df['Tiết'].apply(clean_tiet)
    df['Số tiết'] = df.get('Số tiết', 1).astype(float)
    
    # Tách chuỗi lớp ghép
    df['Lớp'] = df['Lớp'].astype(str).str.replace(' ', '').str.upper()
    df = df.assign(Lớp=df['Lớp'].str.split(',')).explode('Lớp')
    df['loai_gio'] = df['Lớp'].apply(get_loai_gio)

    # ---------------------------------------------------------
    # BƯỚC 2: TÍNH GIỜ BẰNG VECTORIZATION (KHÔNG DÙNG VÒNG LẶP)
    # ---------------------------------------------------------
    print("⚡ [INFO] Đang tính giờ bằng thuật toán Vectorization...")
    cols = ['Giờ_ChínhKhóa_TH', 'Giờ_ChínhKhóa_THCS_THPT', 'Giờ_HSG', 'Giờ_DT', 'Giờ_PD', 'Giờ_CLB']
    for c in cols: df[c] = 0.0

    # Khởi tạo các mask (Mặt nạ logic)
    lop_lower = df['Lớp'].str.lower()
    m_hsg = lop_lower.str.contains(r'hsg|học sinh giỏi', na=False)
    m_dt = lop_lower.str.contains(r'đt|đội tuyển', na=False)
    m_pd = lop_lower.str.contains(r'pd|phụ đạo', na=False)
    m_clb = lop_lower.str.contains(r'clb|câu lạc bộ', na=False)
    m_dac_thu = m_hsg | m_dt | m_pd | m_clb
    
    m_th = (~m_dac_thu) & (df['loai_gio'] == "TH")
    m_thcs = (~m_dac_thu) & (df['loai_gio'] == "THCS/THPT")

    # Áp dụng hệ số đồng loạt siêu tốc
    st = df['Số tiết']
    df.loc[m_hsg, 'Giờ_HSG'] = st * 0.75
    df.loc[m_dt, 'Giờ_DT'] = st * 0.75
    df.loc[m_pd, 'Giờ_PD'] = st * 0.75
    df.loc[m_clb, 'Giờ_CLB'] = st * 1.25
    df.loc[m_th, 'Giờ_ChínhKhóa_TH'] = st * 0.583
    df.loc[m_thcs, 'Giờ_ChínhKhóa_THCS_THPT'] = st * 0.75

    # ---------------------------------------------------------
    # BƯỚC 3: XÂY DỰNG HASH MAP VÀ ĐỐI SOÁT O(1)
    # ---------------------------------------------------------
    # Xây dựng Từ điển Tọa độ FSP
    fsp_dict = {}
    for _, row in df.dropna(subset=['Ngày']).iterrows():
        key = (row['Ngày'], row['Tiết'], row['Lớp'])
        if key not in fsp_dict:
            fsp_dict[key] = set()
        fsp_dict[key].add(row['Username'])

    file_doitiet = os.path.join(INPUT_DIR, "Doi tiet_Day thay.xlsx")
    log_loi = []
    
    if os.path.exists(file_doitiet):
        print("🔍 [INFO] Đang đối soát sâu bằng Hash Map O(1)...")
        df_dt = pd.read_excel(file_doitiet)
        df_dt['Ngày'] = pd.to_datetime(df_dt['Ngày'], errors='coerce').dt.normalize()
        df_dt['Tiết'] = df_dt['Tiết'].apply(clean_tiet)
        
        # Tách lớp ghép cho file đổi tiết
        df_dt['Lớp'] = df_dt['Lớp'].astype(str).str.replace(' ', '').str.upper()
        df_dt = df_dt.assign(Lớp=df_dt['Lớp'].str.split(',')).explode('Lớp')

        for _, row in df_dt.dropna(subset=['Ngày']).iterrows():
            ngay, tiet, lop = row['Ngày'], row['Tiết'], row['Lớp']
            gv_goc = str(row.get('Account GV theo TKB', '')).strip().upper()
            gv_thay = str(row.get('Account GV dạy thay', '')).strip().upper()
            
            if gv_goc == 'NAN' or gv_thay == 'NAN' or not gv_thay: continue

            key = (ngay, tiet, lop)
            
            # Tra cứu tức thì
            if key not in fsp_dict:
                log_loi.append({'Ngày': ngay, 'Tiết': tiet, 'Lớp': lop, 'Trạng Thái': 'LỖI ĐỎ', 'Chi Tiết': 'Không tìm thấy tọa độ trên FSP'})
            else:
                fsp_users = fsp_dict[key]
                if gv_thay not in fsp_users:
                    log_loi.append({'Ngày': ngay, 'Tiết': tiet, 'Lớp': lop, 'GV Gốc': gv_goc, 'GV Thay': gv_thay, 'Trạng Thái': 'LỖI ĐỎ', 'Chi Tiết': f'FSP chưa ghi nhận GV dạy thay {gv_thay}'})
                if gv_goc in fsp_users:
                    log_loi.append({'Ngày': ngay, 'Tiết': tiet, 'Lớp': lop, 'GV Gốc': gv_goc, 'GV Thay': gv_thay, 'Trạng Thái': 'CẢNH BÁO VÀNG', 'Chi Tiết': f'FSP quên trừ giờ GV gốc {gv_goc}'})

    # ---------------------------------------------------------
    # BƯỚC 4: TỔNG HỢP VÀ XUẤT EXCEL
    # ---------------------------------------------------------
    print("📊 [INFO] Tổng hợp và xuất báo cáo...")
    df_tonghop = df.groupby(['Username'])[cols].sum().reset_index()
    df_tonghop['Tổng_Giờ_Trả_Lương'] = df_tonghop[cols].sum(axis=1)
    df_tonghop['Tổng_Giờ_Xét_Định_Mức'] = df_tonghop['Giờ_ChínhKhóa_TH'] + df_tonghop['Giờ_ChínhKhóa_THCS_THPT']
    df_tonghop['canh_bao_vuot_gio'] = df_tonghop['Tổng_Giờ_Xét_Định_Mức'] > 110

    output_path = os.path.join(OUTPUT_DIR, "Bao_Cao_FPT_QA_V9.0_Perfect.xlsx")
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='1. Chi Tiết FSP', index=False)
        df_tonghop.to_excel(writer, sheet_name='2. Tổng Hợp', index=False)
        if log_loi:
            pd.DataFrame(log_loi).to_excel(writer, sheet_name='3. Log Đối Soát', index=False)
    
    print(f"✅ [SUCCESS] Xong! Báo cáo tối ưu hóa lưu tại: {output_path}")

if __name__ == "__main__":
    main()

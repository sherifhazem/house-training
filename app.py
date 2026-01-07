import streamlit as st
import pandas as pd
import plotly.express as px
from streamlit_gsheets import GSheetsConnection

# 1. إعدادات الصفحة - يجب أن تظل أول أمر
st.set_page_config(
    page_title="مربط جادا | لوحة التحكم",
    page_icon="🐎",
    layout="wide",
    initial_sidebar_state="expanded",
)

# الألوان العصرية الجديدة (Modern Slate & Emerald)
PRIMARY_COLOR = "#1E293B"    # Slate Navy
ACCENT_COLOR = "#10B981"     # Emerald Green
TEXT_COLOR = "#0F172A"
BG_COLOR = "#F8FAFC"        # Light Slate Gray

# دالة تطبيق الستايل العصري
def apply_custom_style():
    style_code = f"""
    <style>
        .stApp {{ background-color: {BG_COLOR}; }}
        
        /* تحسين كروت الإحصائيات */
        [data-testid="stMetricValue"] {{
            color: {PRIMARY_COLOR} !important;
            font-size: 2.5rem !important;
            font-weight: 800 !important;
        }}
        [data-testid="stMetricLabel"] {{
            color: #64748B !important;
            font-size: 1rem !important;
            font-weight: 600 !important;
        }}
        .stMetric {{ 
            background-color: white !important; 
            padding: 24px !important; 
            border-radius: 16px !important; 
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
            border-bottom: 4px solid {ACCENT_COLOR} !important;
        }}
        
        h1, h2, h3, p, span {{ font-family: 'Inter', 'Arial', sans-serif; }}
        h1 {{ color: {PRIMARY_COLOR} !important; font-weight: 800 !important; }}
        
        /* تخصيص الأزرار */
        div.stButton > button {{
            background-color: {PRIMARY_COLOR} !important;
            color: white !important;
            border-radius: 12px !important;
            padding: 10px 24px !important;
            font-weight: 600 !important;
            border: none !important;
            transition: all 0.3s ease !important;
        }}
        div.stButton > button:hover {{
            background-color: {ACCENT_COLOR} !important;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
        }}
    </style>
    """
    st.html(style_code)

# إدارة حالة تسجيل الدخول
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def login_page():
    apply_custom_style()
    st.html(f"<div style='text-align: center; padding: 40px;'><h1 style='margin-bottom: 0;'>مربط جادا للأصالة</h1><p style='color: #64748B;'>نظام إدارة وتتبع تدريب الخيل</p></div>")
    
    _, col2, _ = st.columns([1, 1.5, 1])
    with col2:
        with st.container(border=True):
            st.markdown("### تسجيل الدخول")
            username = st.text_input("اسم المستخدم", key="user")
            password = st.text_input("كلمة المرور", type="password", key="pass")
            if st.button("دخول النظام", use_container_width=True):
                if username == "jada" and password == "A1070447089a":
                    st.session_state['logged_in'] = True
                    st.rerun()
                else:
                    st.error("بيانات الدخول غير صحيحة")

# منطق العرض الرئيسي
if not st.session_state['logged_in']:
    login_page()
else:
    apply_custom_style()
    
    SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1g4UeiatYMYjUTRoEZtnQ-rl0JCFafvz-coraywc2Ukw/edit?usp=sharing"

    try:
        conn = st.connection("gsheets", type=GSheetsConnection)
        df = conn.read(spreadsheet=SPREADSHEET_URL)
        df.columns = df.columns.str.strip()
        
        if 'Timestamp' in df.columns:
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            df['التاريخ'] = df['Timestamp'].dt.date
            df['وقت التدريب'] = df['Timestamp'].dt.strftime('%I:%M %p') # إضافة عمود الوقت
            
    except Exception as e:
        st.error(f"فشل الاتصال بجدول البيانات: {e}")
        st.stop()

    # القائمة الجانبية العصرية
    st.sidebar.html(f"<div style='padding: 20px 0;'><h2 style='color:{PRIMARY_COLOR}; margin:0;'>JADA STABLES</h2><p style='font-size:0.8rem; color:#64748B;'>Dashboard v2.0</p></div>")
    
    if st.sidebar.button("تسجيل الخروج", use_container_width=True):
        st.session_state['logged_in'] = False
        st.rerun()

    st.sidebar.divider()
    st.sidebar.subheader("تصفية البيانات")

    horse_list = df["اسم الخيل"].unique().tolist()
    horse_filter = st.sidebar.multiselect("الخيل:", options=horse_list, default=horse_list)
    
    training_list = df["نوع التدريب اليومي"].unique().tolist()
    training_filter = st.sidebar.multiselect("البرنامج:", options=training_list, default=training_list)

    filtered_df = df[df["اسم الخيل"].isin(horse_filter) & df["نوع التدريب اليومي"].isin(training_filter)].copy()

    # الواجهة الرئيسية
    st.title("🐎 لوحة تتبع التدريب اليومي")
    st.markdown("متابعة أداء الخيل والبرامج التدريبية المعتمدة")
    
    if filtered_df.empty:
        st.warning("لا توجد بيانات متاحة لهذا الاختيار.")
    else:
        # كروت الإحصائيات العصرية
        m1, m2, m3 = st.columns(3)
        
        filtered_df["مدة الحصة التدريبية بالدقيقة"] = pd.to_numeric(filtered_df["مدة الحصة التدريبية بالدقيقة"], errors='coerce').fillna(0)
        filtered_df["تقييم نشاط واستجابة الخيل"] = pd.to_numeric(filtered_df["تقييم نشاط واستجابة الخيل"], errors='coerce').fillna(0)

        m1.metric("إجمالي الحصص", f"{len(filtered_df)}")
        m2.metric("متوسط النشاط", f"{filtered_df['تقييم نشاط واستجابة الخيل'].mean():.1f}/5")
        m3.metric("دقائق التدريب", f"{int(filtered_df['مدة الحصة التدريبية بالدقيقة'].sum())}")

        st.markdown("<br>", unsafe_allow_html=True)

        # الرسوم البيانية
        c1, c2 = st.columns([1, 2])
        with c1:
            st.markdown("#### توزيع التمارين")
            fig_p = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.5, 
                         color_discrete_sequence=[PRIMARY_COLOR, ACCENT_COLOR, "#38BDF8", "#818CF8"])
            fig_p.update_layout(margin=dict(t=0, b=0, l=0, r=0), showlegend=False)
            st.plotly_chart(fig_p, use_container_width=True)
            
        with c2:
            st.markdown("#### منحنى أداء الخيل")
            fig_l = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                           color="اسم الخيل", markers=True,
                           color_discrete_sequence=[PRIMARY_COLOR, ACCENT_COLOR, "#38BDF8"])
            fig_l.update_layout(xaxis_title=None, yaxis_title="التقييم", margin=dict(t=20, b=0))
            st.plotly_chart(fig_l, use_container_width=True)

        st.markdown("#### 📋 السجل التفصيلي للتدريب")
        
        # تجهيز عمود المرفقات كروابط حقيقية
        media_col = "يمكنك رفع صور او فيدو للتوثيق"
        if media_col in filtered_df.columns:
            filtered_df['المرفقات'] = filtered_df[media_col]
        else:
            filtered_df['المرفقات'] = None

        # اختيار الأعمدة وتجهيز الجدول
        display_cols = ["التاريخ", "وقت التدريب", "اسم الخيل", "نوع التدريب اليومي", "ملاحظات صحية", "المرفقات"]
        
        # عرض الجدول مع تفعيل الروابط
        st.dataframe(
            filtered_df[display_cols],
            use_container_width=True,
            column_config={
                "المرفقات": st.column_config.LinkColumn(
                    "المرفقات", 
                    display_text="🔗 فتح المرفق",
                    help="اضغط لفتح الصورة أو الفيديو في نافذة جديدة"
                ),
                "التاريخ": st.column_config.DateColumn("التاريخ", format="YYYY/MM/DD"),
                "وقت التدريب": st.column_config.TextColumn("الوقت")
            },
            hide_index=True
        )

    st.markdown("<br><br>", unsafe_allow_html=True)
    st.html(f"<div style='text-align: center; color: #64748B; font-size: 0.9rem; border-top: 1px solid #E2E8F0; padding-top: 20px;'>نظام إدارة مربط جادا للأصالة © 2026</div>")

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

# الألوان العصرية الجديدة مع تحسين التباين للوضوح
PRIMARY_COLOR = "#0F172A"    # Navy غامق جداً للوضوح
ACCENT_COLOR = "#059669"     # Emerald غامق قليلاً
TEXT_MAIN = "#1E293B"        # لون نص أساسي واضح
BG_COLOR = "#F1F5F9"        # خلفية رمادية فاتحة جداً

# دالة تطبيق الستايل العصري المحسن
def apply_custom_style():
    style_code = f"""
    <style>
        .stApp {{ background-color: {BG_COLOR}; }}
        
        /* تحسين كروت الإحصائيات - ألوان أكثر حيوية ووضوحاً */
        [data-testid="stMetricValue"] {{
            color: {PRIMARY_COLOR} !important;
            font-size: 2.8rem !important;
            font-weight: 900 !important;
            letter-spacing: -1px;
        }}
        [data-testid="stMetricLabel"] {{
            color: {TEXT_MAIN} !important;
            font-size: 1.1rem !important;
            font-weight: 700 !important;
            margin-bottom: 8px !important;
        }}
        .stMetric {{ 
            background-color: white !important; 
            padding: 24px !important; 
            border-radius: 20px !important; 
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05) !important;
            border-left: 6px solid {ACCENT_COLOR} !important;
        }}
        
        /* تحسين وضوح نصوص الجداول */
        .stTable, .stDataFrame {{
            color: {TEXT_MAIN} !important;
        }}
        
        h1, h2, h3, h4 {{ 
            color: {PRIMARY_COLOR} !important; 
            font-weight: 800 !important; 
        }}
        
        /* تخصيص الأزرار */
        div.stButton > button {{
            background-color: {PRIMARY_COLOR} !important;
            color: white !important;
            border-radius: 12px !important;
            padding: 12px 28px !important;
            font-weight: 700 !important;
            border: none !important;
        }}
    </style>
    """
    st.html(style_code)

# إدارة حالة تسجيل الدخول
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def login_page():
    apply_custom_style()
    st.html(f"<div style='text-align: center; padding: 40px;'><h1 style='margin-bottom: 0;'>مربط جادا للأصالة</h1><p style='color: {TEXT_MAIN}; font-size: 1.2rem;'>نظام إدارة وتتبع تدريب الخيل</p></div>")
    
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
            df['وقت التدريب'] = df['Timestamp'].dt.strftime('%I:%M %p')
            
    except Exception as e:
        st.error(f"فشل الاتصال بجدول البيانات: {e}")
        st.stop()

    # القائمة الجانبية
    st.sidebar.html(f"<div style='padding: 20px 0;'><h2 style='color:{PRIMARY_COLOR}; margin:0;'>JADA STABLES</h2><p style='font-size:0.8rem; color:{TEXT_MAIN};'>Dashboard v2.1</p></div>")
    
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
    
    if filtered_df.empty:
        st.warning("لا توجد بيانات متاحة لهذا الاختيار.")
    else:
        # كروت الإحصائيات
        m1, m2, m3 = st.columns(3)
        
        filtered_df["مدة الحصة التدريبية بالدقيقة"] = pd.to_numeric(filtered_df["مدة الحصة التدريبية بالدقيقة"], errors='coerce').fillna(0)
        filtered_df["تقييم نشاط واستجابة الخيل"] = pd.to_numeric(filtered_df["تقييم نشاط واستجابة الخيل"], errors='coerce').fillna(0)

        m1.metric("إجمالي الحصص", f"{len(filtered_df)}")
        m2.metric("متوسط النشاط", f"{filtered_df['تقييم نشاط واستجابة الخيل'].mean():.1f}/5")
        m3.metric("دقائق التدريب", f"{int(filtered_df['مدة الحصة التدريبية بالدقيقة'].sum())}")

        st.markdown("<br>", unsafe_allow_html=True)

        # الرسوم البيانية مع تحسين ألوان الخطوط للوضوح
        c1, c2 = st.columns([1, 2])
        with c1:
            st.markdown("#### توزيع التمارين")
            fig_p = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.5, 
                         color_discrete_sequence=[PRIMARY_COLOR, ACCENT_COLOR, "#3B82F6", "#6366F1"])
            fig_p.update_layout(
                margin=dict(t=0, b=0, l=0, r=0), 
                showlegend=True,
                font=dict(color=PRIMARY_COLOR, size=14)
            )
            st.plotly_chart(fig_p, use_container_width=True)
            
        with c2:
            st.markdown("#### منحنى أداء الخيل")
            fig_l = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                           color="اسم الخيل", markers=True,
                           color_discrete_sequence=[PRIMARY_COLOR, ACCENT_COLOR, "#3B82F6"])
            fig_l.update_layout(
                xaxis_title=None, 
                yaxis_title="التقييم", 
                margin=dict(t=20, b=0),
                font=dict(color=PRIMARY_COLOR, size=12),
                hovermode="x unified"
            )
            st.plotly_chart(fig_l, use_container_width=True)

        st.markdown("#### 📋 السجل التفصيلي للتدريب")
        
        # تجهيز المرفقات
        media_col = "يمكنك رفع صور او فيدو للتوثيق"
        if media_col in filtered_df.columns:
            filtered_df['المرفقات'] = filtered_df[media_col]
        else:
            filtered_df['المرفقات'] = None

        # إضافة مدة التدريب للقائمة المطلوبة للعرض
        display_cols = ["التاريخ", "وقت التدريب", "اسم الخيل", "نوع التدريب اليومي", "مدة الحصة التدريبية بالدقيقة", "ملاحظات صحية", "المرفقات"]
        
        # عرض الجدول مع تحسين وضوح البيانات والروابط
        st.dataframe(
            filtered_df[display_cols],
            use_container_width=True,
            column_config={
                "المرفقات": st.column_config.LinkColumn(
                    "المرفقات", 
                    display_text="🔗 فتح المرفق",
                    width="medium"
                ),
                "التاريخ": st.column_config.DateColumn("التاريخ", format="YYYY/MM/DD"),
                "وقت التدريب": st.column_config.TextColumn("الوقت"),
                "مدة الحصة التدريبية بالدقيقة": st.column_config.NumberColumn("المدة (دقيقة)", format="%d د"),
                "اسم الخيل": st.column_config.TextColumn("الخيل"),
                "نوع التدريب اليومي": st.column_config.TextColumn("البرنامج")
            },
            hide_index=True
        )

    st.markdown("<br><br>", unsafe_allow_html=True)
    st.html(f"<div style='text-align: center; color: {TEXT_MAIN}; font-size: 1rem; border-top: 1px solid #CBD5E1; padding-top: 20px; font-weight: 600;'>نظام إدارة مربط جادا للأصالة © 2026</div>")

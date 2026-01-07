import streamlit as st
import pandas as pd
import plotly.express as px
from streamlit_gsheets import GSheetsConnection

# 1. إعدادات الصفحة - يجب أن تظل أول أمر
st.set_page_config(
    page_title="داش بورد مربط جادا",
    page_icon="🐎",
    layout="wide",
    initial_sidebar_state="expanded",
)

# الألوان الرسمية للمربط
MAIN_COLOR = "#4E2C22"  # بني غامق
BG_COLOR = "#F5F5F5"    # بيج

# بيانات الدخول المحددة
USER_ID = "jada"
USER_PW = "A1070447089a"

# دالة تطبيق الستايل باستخدام st.html لتجنب تعارض الـ Markdown
def apply_custom_style():
    style_code = f"""
    <style>
        .stApp {{ background-color: {BG_COLOR}; }}
        .stMetric {{ 
            background-color: white !important; 
            padding: 20px !important; 
            border-radius: 10px !important; 
            border: 1px solid #ddd !important; 
        }}
        h1, h2, h3, p, span {{ font-family: 'Arial', sans-serif; }}
        h1, h2, h3 {{ color: {MAIN_COLOR} !important; }}
        div.stButton > button {{
            background-color: {MAIN_COLOR} !important;
            color: white !important;
            border-radius: 5px !important;
        }}
    </style>
    """
    st.html(style_code)

# إدارة حالة تسجيل الدخول
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def login_page():
    apply_custom_style()
    # تم التصحيح: استخدام st.html بدلاً من st.markdown للعناوين
    st.html(f"<h1 style='text-align: center;'>تسجيل الدخول - مربط جادا</h1>")
    
    _, col2, _ = st.columns([1, 2, 1])
    with col2:
        username = st.text_input("اسم المستخدم", key="user")
        password = st.text_input("كلمة المرور", type="password", key="pass")
        if st.button("دخول"):
            if username == USER_ID and password == USER_PW:
                st.session_state['logged_in'] = True
                st.rerun()
            else:
                st.error("خطأ في اسم المستخدم أو كلمة المرور")

# منطق العرض الرئيسي
if not st.session_state['logged_in']:
    login_page()
else:
    apply_custom_style()
    
    # رابط الشيت الخاص بك
    SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1g4UeiatYMYjUTRoEZtnQ-rl0JCFafvz-coraywc2Ukw/edit?usp=sharing"

    try:
        conn = st.connection("gsheets", type=GSheetsConnection)
        df = conn.read(spreadsheet=SPREADSHEET_URL)
        
        if 'Timestamp' in df.columns:
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            df['التاريخ'] = df['Timestamp'].dt.date
            
    except Exception as e:
        st.error("فشل الاتصال بجدول البيانات. تأكد من إعدادات المشاركة.")
        st.stop()

    # القائمة الجانبية
    # تم التصحيح: استخدام الخاصية الصحيحة unsafe_allow_html
    st.sidebar.markdown(f"<h2 style='color:{MAIN_COLOR}'>مربط جادا للأصالة</h2>", unsafe_allow_html=True)
    
    if st.sidebar.button("تسجيل الخروج"):
        st.session_state['logged_in'] = False
        st.rerun()

    st.sidebar.divider()
    st.sidebar.title("الفلاتر التفاعلية")

    if "اسم الخيل" in df.columns:
        horse_list = df["اسم الخيل"].unique().tolist()
        horse_filter = st.sidebar.multiselect("اختر اسم الخيل:", options=horse_list, default=horse_list)
        
        training_list = df["نوع التدريب اليومي"].unique().tolist()
        training_filter = st.sidebar.multiselect("نوع التدريب:", options=training_list, default=training_list)

        filtered_df = df[df["اسم الخيل"].isin(horse_filter) & df["نوع التدريب اليومي"].isin(training_filter)]
    else:
        st.error("تأكد من وجود عمود 'اسم الخيل' في ملف البيانات.")
        st.stop()

    # عرض البيانات
    st.title("🐎 تقرير تدريب الخيل اليومي - مربط جادا")
    st.divider()

    if filtered_df.empty:
        st.warning("لا توجد بيانات تطابق هذه الفلاتر.")
    else:
        m1, m2, m3 = st.columns(3)
        m1.metric("إجمالي الحصص", len(filtered_df))
        
        avg_act = filtered_df["تقييم نشاط واستجابة الخيل"].mean()
        m2.metric("متوسط تقييم النشاط", f"{avg_act:.1f} / 5")
        
        filtered_df["مدة الحصة التدريبية بالدقيقة"] = pd.to_numeric(filtered_df["مدة الحصة التدريبية بالدقيقة"], errors='coerce')
        total_m = filtered_df["مدة الحصة التدريبية بالدقيقة"].sum()
        m3.metric("إجمالي الدقائق", f"{int(total_m)}")

        st.divider()

        c1, c2 = st.columns(2)
        with c1:
            fig_p = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.4, 
                         color_discrete_sequence=[MAIN_COLOR, "#D4AF37", "#A67C52"])
            st.plotly_chart(fig_p, use_container_width=True)
        with c2:
            fig_l = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                           color="اسم الخيل", markers=True,
                           color_discrete_sequence=[MAIN_COLOR, "#D4AF37"])
            st.plotly_chart(fig_l, use_container_width=True)

        st.subheader("📋 سجل التدريب التفصيلي")
        
        media_col = "يمكنك رفع صور او فيدو للتوثيق"
        if media_col in filtered_df.columns:
            filtered_df['المرفقات'] = filtered_df[media_col].apply(
                lambda x: "🔗 عرض المرفق" if pd.notnull(x) and str(x).startswith('http') else "❌ لا يوجد"
            )
        
        cols = ["Timestamp", "اسم الخيل", "نوع التدريب اليومي", "ملاحظات صحية", "المرفقات"]
        st.dataframe(filtered_df[cols], use_container_width=True)

    st.divider()
    # تم التصحيح: استخدام st.html للتذييل
    st.html(f"<div style='text-align: center; color: {MAIN_COLOR};'>جميع الحقوق محفوظة - مربط جادا 2026</div>")

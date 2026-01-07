import streamlit as st
import pandas as pd
import plotly.express as px
from streamlit_gsheets import GSheetsConnection

# إعدادات الصفحة
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

# تطبيق الستايل الخاص عبر CSS
# ملاحظة: تم تبسيط الستايل لتجنب أي تعارض مع بايثون 3.13
style_code = f"""
    <style>
    .main {{ background-color: {BG_COLOR}; }}
    .stMetric {{ background-color: white; padding: 20px; border-radius: 10px; border: 1px solid #ddd; }}
    h1, h2, h3 {{ color: {MAIN_COLOR}; font-family: 'Arial'; }}
    div.stButton > button:first-child {{
        background-color: {MAIN_COLOR};
        color: white;
    }}
    </style>
    """
st.markdown(style_code, unsafe_markdown=True)

# إدارة حالة تسجيل الدخول (Session State)
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def login():
    st.markdown(f"<h2 style='text-align: center; color: {MAIN_COLOR};'>تسجيل الدخول - مربط جادا</h2>", unsafe_markdown=True)
    
    with st.container():
        _, col2, _ = st.columns([1, 2, 1])
        with col2:
            username = st.text_input("اسم المستخدم", placeholder="Enter username")
            password = st.text_input("كلمة المرور", type="password", placeholder="Enter password")
            if st.button("دخول"):
                if username == USER_ID and password == USER_PW:
                    st.session_state['logged_in'] = True
                    st.rerun()
                else:
                    st.error("خطأ في اسم المستخدم أو كلمة المرور")

# العرض بناءً على حالة الدخول
if not st.session_state['logged_in']:
    login()
else:
    # 1. الاتصال بجوجل شيت (استخدم رابط الشيت الخاص بك هنا)
    SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1g4UeiatYMYjUTRoEZtnQ-rl0JCFafvz-coraywc2Ukw/edit?usp=sharing"

    try:
        conn = st.connection("gsheets", type=GSheetsConnection)
        df = conn.read(spreadsheet=SPREADSHEET_URL)
        
        # تنظيف البيانات
        if 'Timestamp' in df.columns:
            df['Timestamp'] = pd.to_datetime(df['Timestamp'])
            df['التاريخ'] = df['Timestamp'].dt.date
        
    except Exception as e:
        st.error("فشل الاتصال بجدول البيانات. تأكد من إعدادات المشاركة (Anyone with the link can view)")
        st.stop()

    # --- الواجهة الجانبية (Sidebar) ---
    st.sidebar.markdown(f"<h2 style='color:{MAIN_COLOR}'>مربط جادا للأصالة</h2>", unsafe_markdown=True)
    
    if st.sidebar.button("تسجيل الخروج"):
        st.session_state['logged_in'] = False
        st.rerun()

    st.sidebar.title("الفلاتر التفاعلية")

    # اختيار اسم الخيل
    if "اسم الخيل" in df.columns:
        all_horses = df["اسم الخيل"].unique().tolist()
        horse_filter = st.sidebar.multiselect("اختر اسم الخيل:", options=all_horses, default=all_horses)
        
        # اختيار نوع التدريب
        all_training = df["نوع التدريب اليومي"].unique().tolist()
        training_filter = st.sidebar.multiselect("نوع التدريب:", options=all_training, default=all_training)

        # تصفية البيانات
        mask = df["اسم الخيل"].isin(horse_filter) & df["نوع التدريب اليومي"].isin(training_filter)
        filtered_df = df[mask]
    else:
        st.error("لم يتم العثور على عمود 'اسم الخيل' في الملف.")
        st.stop()

    # --- القسم الرئيسي (Main Dashboard) ---
    st.title("🐎 تقرير تدريب الخيل اليومي - مربط جادا")
    st.markdown("---")

    if filtered_df.empty:
        st.warning("لا توجد بيانات تطابق الفلاتر المختارة.")
    else:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("إجمالي الحصص", len(filtered_df))
        with col2:
            avg_rating = filtered_df["تقييم نشاط واستجابة الخيل"].mean()
            st.metric("متوسط تقييم النشاط", f"{avg_rating:.1f} / 5")
        with col3:
            filtered_df["مدة الحصة التدريبية بالدقيقة"] = pd.to_numeric(filtered_df["مدة الحصة التدريبية بالدقيقة"], errors='coerce')
            total_minutes = filtered_df["مدة الحصة التدريبية بالدقيقة"].sum()
            st.metric("إجمالي دقائق التدريب", f"{int(total_minutes)} دقيقة")

        st.markdown("---")

        c1, c2 = st.columns(2)
        with c1:
            st.subheader("توزيع أنواع التدريب")
            fig_pie = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.4, 
                         color_discrete_sequence=[MAIN_COLOR, "#D4AF37", "#A67C52", "#E5D3B3"])
            st.plotly_chart(fig_pie, use_container_width=True)

        with c2:
            st.subheader("مستوى النشاط بمرور الوقت")
            fig_line = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                           color="اسم الخيل", markers=True,
                           color_discrete_sequence=[MAIN_COLOR, "#D4AF37", "#A67C52"])
            st.plotly_chart(fig_line, use_container_width=True)

        st.subheader("📋 سجل التدريب التفصيلي")
        display_df = filtered_df.copy()
        media_col = "يمكنك رفع صور او فيدو للتوثيق"
        if media_col in display_df.columns:
            display_df['المرفقات'] = display_df[media_col].apply(
                lambda x: "🔗 عرض المرفق" if pd.notnull(x) and str(x).startswith('http') else "❌ لا يوجد"
            )
        
        cols_to_show = ["Timestamp", "اسم الخيل", "نوع التدريب اليومي", "ملاحظات صحية", "المرفقات"]
        st.dataframe(display_df[cols_to_show], use_container_width=True)

    st.markdown("---")
    st.markdown(f"<div style='text-align: center; color: {MAIN_COLOR};'>جميع الحقوق محفوظة - مربط جادا 2026</div>", unsafe_markdown=True)

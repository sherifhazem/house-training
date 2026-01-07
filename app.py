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

# تطبيق الستايل الخاص عبر CSS
st.markdown(f"""
    <style>
    .main {{ background-color: {BG_COLOR}; }}
    .stMetric {{ background-color: white; padding: 20px; border-radius: 10px; border: 1px solid #ddd; }}
    h1, h2, h3 {{ color: {MAIN_COLOR}; font-family: 'Arial'; }}
    </style>
    """, unsafe_markdown=True)

# 1. الاتصال بجوجل شيت (يجب إضافة الرابط في Secrets لاحقاً)
# نستخدم طريقة الاتصال المدمجة في Streamlit
try:
    conn = st.connection("gsheets", type=GSheetsConnection)
    df = conn.read()
except Exception as e:
    st.error("فشل الاتصال بجدول البيانات. تأكد من إعداد الروابط بشكل صحيح.")
    st.stop()

# تنظيف البيانات (تغيير الأسماء لتطابق شيت جوجل الخاص بك)
df['Timestamp'] = pd.to_datetime(df['Timestamp'])
df['التاريخ'] = df['Timestamp'].dt.date

# --- الواجهة الجانبية (Sidebar) ---
st.sidebar.image("https://via.placeholder.com/150", caption="مربط جادا للأصالة") # استبدل برابط اللوجو الخاص بك
st.sidebar.title("الفلاتر التفاعلية")

horse_filter = st.sidebar.multiselect(
    "اختر اسم الخيل:",
    options=df["اسم الخيل"].unique(),
    default=df["اسم الخil"].unique()
)

training_filter = st.sidebar.multiselect(
    "نوع التدريب:",
    options=df["نوع التدريب اليومي"].unique(),
    default=df["نوع التدريب اليومي"].unique()
)

# تصفية البيانات بناءً على الاختيارات
mask = df["اسم الخيل"].isin(horse_filter) & df["نوع التدريب اليومي"].isin(training_filter)
filtered_df = df[mask]

# --- القسم الرئيسي (Main Dashboard) ---
st.title("🐎 تقرير تدريب الخيل اليومي - مربط جادا")
st.markdown("---")

# بطاقات الأداء العلوي (Metrics)
col1, col2, col3 = st.columns(3)
with col1:
    st.metric("إجمالي الحصص", len(filtered_df))
with col2:
    avg_rating = filtered_df["تقييم نشاط واستجابة الخيل"].mean()
    st.metric("متوسط تقييم النشاط", f"{avg_rating:.1f} / 5")
with col3:
    total_minutes = filtered_df["مدة الحصة التدريبية بالدقيقة"].sum()
    st.metric("إجمالي دقائق التدريب", f"{total_minutes} دقيقة")

st.markdown("---")

# الرسوم البيانية
c1, c2 = st.columns(2)

with c1:
    st.subheader("توزيع أنواع التدريب")
    fig_pie = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.4, 
                 color_discrete_sequence=[MAIN_COLOR, "#D4AF37", "#A67C52"])
    st.plotly_chart(fig_pie, use_container_width=True)

with c2:
    st.subheader("مستوى النشاط بمرور الوقت")
    fig_line = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                   color="اسم الخيل", markers=True,
                   color_discrete_sequence=[MAIN_COLOR, "#D4AF37"])
    st.plotly_chart(fig_line, use_container_width=True)

# جدول البيانات التفصيلي
st.subheader("📋 سجل التدريب التفصيلي")
# إضافة أيقونة للوسائط إذا وجد رابط
if "يمكنك رفع صور او فيدو للتوثيق" in filtered_df.columns:
    filtered_df['المرفقات'] = filtered_df['يمكنك رفع صور او فيدو للتوثيق'].apply(
        lambda x: "🔗 عرض" if pd.notnull(x) else "❌ لا يوجد"
    )

st.dataframe(filtered_df[["Timestamp", "اسم الخيل", "نوع التدريب اليومي", "الحالة الصحية", "المرفقات"]], 
             use_container_width=True)

# تذييل الصفحة
st.markdown(f"""
    <div style='text-align: center; color: {MAIN_COLOR}; padding: 20px;'>
        جميع الحقوق محفوظة - مربط جادا 2026
    </div>
    """, unsafe_markdown=True)

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go # مكتبة الرسوم المتقدمة للمؤشرات
from streamlit_gsheets import GSheetsConnection

# 1. إعدادات الصفحة - يجب أن تظل أول أمر
st.set_page_config(
    page_title="مربط جادا | لوحة التحكم",
    page_icon="🐎",
    layout="wide",
    initial_sidebar_state="expanded",
)

# الألوان العصرية الرسمية (Modern Corporate Palette)
PRIMARY_COLOR = "#0B2447"    # Deep Royal Navy
ACCENT_COLOR = "#00A8CC"     # Bright Turquoise
BG_COLOR = "#F3F4F6"        # Cool Gray Background
TEXT_MAIN = "#1F2937"        # Dark Gray Text

# لوحة ألوان متسقة مع هوية الموقع (تدرجات الأزرق والفيروزي)
CHART_COLORS = [
    "#0B2447",  # Navy
    "#00609C",  # Medium Blue
    "#00A8CC",  # Turquoise
    "#48C9B0",  # Teal (للتباين الناعم)
    "#1F2937"   # Charcoal
]

# دالة تطبيق الستايل العصري المحسن
def apply_custom_style():
    style_code = f"""
    <style>
        .stApp {{ background-color: {BG_COLOR}; }}
        
        /* تحسين كروت الإحصائيات */
        [data-testid="stMetricValue"] {{
            color: {PRIMARY_COLOR} !important;
            font-size: 2.5rem !important;
            font-weight: 800 !important;
            font-family: 'Segoe UI', sans-serif;
        }}
        [data-testid="stMetricLabel"] {{
            color: #4B5563 !important;
            font-size: 1rem !important;
            font-weight: 600 !important;
        }}
        .stMetric {{ 
            background-color: white !important; 
            padding: 20px 24px !important; 
            border-radius: 16px !important; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
            border-top: 4px solid {ACCENT_COLOR} !important;
        }}
        
        /* عناوين الصفحات */
        h1, h2, h3 {{ 
            color: {PRIMARY_COLOR} !important; 
            font-family: 'Segoe UI', sans-serif !important;
            font-weight: 700 !important;
        }}
        
        /* تحسين الجداول */
        .stDataFrame {{ border-radius: 10px; overflow: hidden; }}
        
        /* تخصيص الأزرار */
        div.stButton > button {{
            background-color: {PRIMARY_COLOR} !important;
            color: white !important;
            border-radius: 8px !important;
            padding: 10px 24px !important;
            border: 1px solid {PRIMARY_COLOR} !important;
            transition: all 0.2s;
        }}
        div.stButton > button:hover {{
            background-color: {ACCENT_COLOR} !important;
            border-color: {ACCENT_COLOR} !important;
        }}
    </style>
    """
    st.html(style_code)

# إدارة حالة تسجيل الدخول
if 'logged_in' not in st.session_state:
    st.session_state['logged_in'] = False

def login_page():
    apply_custom_style()
    st.html(f"<div style='text-align: center; padding: 60px 20px;'><h1 style='margin-bottom: 10px; font-size: 3rem;'>مربط جادا للأصالة</h1><p style='color: #6B7280; font-size: 1.2rem;'>بوابة الإدارة الذكية</p></div>")
    
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
    st.sidebar.html(f"""
        <div style='padding: 20px 0; text-align: center;'>
            <h2 style='color:{ACCENT_COLOR}; margin:0; font-size: 1.8rem;'>JADA STABLES</h2>
            <div style='height: 2px; background-color: {ACCENT_COLOR}; width: 50px; margin: 10px auto;'></div>
            <p style='font-size:0.9rem; color:#9CA3AF;'>Executive Dashboard</p>
        </div>
    """)
    
    if st.sidebar.button("تسجيل الخروج", use_container_width=True):
        st.session_state['logged_in'] = False
        st.rerun()

    st.sidebar.divider()
    st.sidebar.markdown("### 🔍 تصفية السجلات")

    # 1. فلتر التاريخ
    min_date = df['التاريخ'].min()
    max_date = df['التاريخ'].max()
    
    date_range = st.sidebar.date_input(
        "الفترة الزمنية:",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date
    )

    # 2. فلاتر الخيل والبرنامج
    horse_list = df["اسم الخيل"].unique().tolist()
    horse_filter = st.sidebar.multiselect("الخيل:", options=horse_list, default=horse_list)
    
    training_list = df["نوع التدريب اليومي"].unique().tolist()
    training_filter = st.sidebar.multiselect("البرنامج:", options=training_list, default=training_list)

    # تطبيق الفلترة
    mask = (
        df["اسم الخيل"].isin(horse_filter) & 
        df["نوع التدريب اليومي"].isin(training_filter)
    )
    
    # منطق فلترة التاريخ
    if isinstance(date_range, tuple):
        if len(date_range) == 2:
            start_date, end_date = date_range
            mask = mask & (df['التاريخ'] >= start_date) & (df['التاريخ'] <= end_date)
        elif len(date_range) == 1:
            start_date = date_range[0]
            mask = mask & (df['التاريخ'] >= start_date)

    filtered_df = df[mask].copy()

    # الواجهة الرئيسية
    st.title("📊 تحليل التدريب اليومي لمربط جادا")
    st.markdown(f"<p style='color: #6B7280;'>نظرة شاملة على أداء وصحة الخيل في المربط</p>", unsafe_allow_html=True)
    st.divider()
    
    if filtered_df.empty:
        st.warning("لا توجد بيانات متاحة لهذا الاختيار.")
    else:
        # معالجة الأرقام
        filtered_df["مدة الحصة التدريبية بالدقيقة"] = pd.to_numeric(filtered_df["مدة الحصة التدريبية بالدقيقة"], errors='coerce').fillna(0)
        filtered_df["تقييم نشاط واستجابة الخيل"] = pd.to_numeric(filtered_df["تقييم نشاط واستجابة الخيل"], errors='coerce').fillna(0)

        # 1. كروت الإحصائيات (KPIs)
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("إجمالي الحصص", f"{len(filtered_df)}")
        with col2:
            avg_score = filtered_df['تقييم نشاط واستجابة الخيل'].mean()
            st.metric("مؤشر الأداء العام", f"{avg_score:.1f} / 5", delta=f"{'ممتاز' if avg_score > 4 else 'جيد'}")
        with col3:
            total_hours = filtered_df['مدة الحصة التدريبية بالدقيقة'].sum() / 60
            st.metric("ساعات التدريب", f"{total_hours:.1f} ساعة")
        with col4:
            active_horses = filtered_df['اسم الخيل'].nunique()
            st.metric("الخيول النشطة", f"{active_horses}")

        st.markdown("<br>", unsafe_allow_html=True)

        # 2. قسم الرسوم البيانية
        
        # الصف الأول: مؤشر الصحة (Gauge) وتوزيع التمارين
        c1, c2 = st.columns([1, 1])
        
        with c1:
            st.subheader("🏥 الحالة الصحية للقطيع")
            if "ملاحظات صحية" in filtered_df.columns:
                # حساب نسبة الخيل السليم
                total_records = len(filtered_df)
                healthy_count = len(filtered_df[filtered_df["ملاحظات صحية"] == "الخيل سليم تماماً"])
                health_percentage = (healthy_count / total_records) * 100 if total_records > 0 else 0
                
                # رسم مؤشر (Gauge Chart) بدلاً من الدائرة
                fig_gauge = go.Figure(go.Indicator(
                    mode = "gauge+number",
                    value = health_percentage,
                    domain = {'x': [0, 1], 'y': [0, 1]},
                    title = {'text': "نسبة الخيول السليمة", 'font': {'size': 20, 'color': PRIMARY_COLOR}},
                    number = {'suffix': "%", 'font': {'color': ACCENT_COLOR}},
                    gauge = {
                        'axis': {'range': [0, 100], 'tickwidth': 1, 'tickcolor': PRIMARY_COLOR},
                        'bar': {'color': ACCENT_COLOR},
                        'bgcolor': "white",
                        'borderwidth': 2,
                        'bordercolor': "gray",
                        'steps': [
                            {'range': [0, 60], 'color': '#FEE2E2'},  # أحمر فاتح للخطر
                            {'range': [60, 85], 'color': '#FEF3C7'}, # أصفر للتحذير
                            {'range': [85, 100], 'color': '#D1FAE5'} # أخضر للممتاز
                        ],
                        'threshold': {
                            'line': {'color': "red", 'width': 4},
                            'thickness': 0.75,
                            'value': 90
                        }
                    }
                ))
                fig_gauge.update_layout(height=350, margin=dict(t=50, b=10, l=30, r=30))
                st.plotly_chart(fig_gauge, use_container_width=True)
            else:
                st.info("لا تتوفر بيانات صحية.")

        with c2:
            st.subheader("🎯 توزيع البرامج التدريبية")
            # استخدام ألوان متسقة مع الهوية
            fig_p = px.pie(filtered_df, names="نوع التدريب اليومي", hole=0.6, 
                         color_discrete_sequence=CHART_COLORS)
            fig_p.update_layout(margin=dict(t=30, b=0, l=0, r=0), showlegend=True)
            st.plotly_chart(fig_p, use_container_width=True)

        # الصف الثاني: منحنى الأداء
        st.subheader("📈 تتبع مستوى الأداء والنشاط")
        # استخدام ألوان متسقة (CHART_COLORS) بدلاً من الألوان العشوائية
        fig_l = px.line(filtered_df, x="Timestamp", y="تقييم نشاط واستجابة الخيل", 
                       color="اسم الخيل", markers=True,
                       color_discrete_sequence=CHART_COLORS)
        
        fig_l.update_layout(
            xaxis_title="التاريخ", 
            yaxis_title="مستوى التقييم (1-5)",
            margin=dict(t=20, b=20, l=0, r=0),
            hovermode="x unified",
            legend=dict(orientation="h", y=1.1, x=0.5, xanchor="center"),
            plot_bgcolor="white",
            font=dict(size=14, color=TEXT_MAIN)
        )
        fig_l.update_yaxes(range=[0.5, 5.5], gridcolor="#E5E7EB")
        fig_l.update_xaxes(gridcolor="#E5E7EB")
        st.plotly_chart(fig_l, use_container_width=True)

        # 3. السجل التفصيلي
        st.markdown("<br>", unsafe_allow_html=True)
        st.subheader("📋 سجل العمليات اليومي")
        
        media_col = "يمكنك رفع صور او فيدو للتوثيق"
        if media_col in filtered_df.columns:
            filtered_df['المرفقات'] = filtered_df[media_col]
        else:
            filtered_df['المرفقات'] = None

        display_cols = ["التاريخ", "وقت التدريب", "اسم الخيل", "نوع التدريب اليومي", "مدة الحصة التدريبية بالدقيقة", "ملاحظات صحية", "المرفقات"]
        
        st.dataframe(
            filtered_df[display_cols],
            use_container_width=True,
            column_config={
                "المرفقات": st.column_config.LinkColumn("المرفقات", display_text="🔗 فتح", width="small"),
                "التاريخ": st.column_config.DateColumn("التاريخ", format="YYYY-MM-DD"),
                "مدة الحصة التدريبية بالدقيقة": st.column_config.NumberColumn("المدة (د)", format="%d"),
                "ملاحظات صحية": st.column_config.TextColumn("الحالة الصحية"),
            },
            hide_index=True
        )

    st.markdown("<br><br>", unsafe_allow_html=True)
    st.html(f"<div style='text-align: center; color: #9CA3AF; font-size: 0.9rem; border-top: 1px solid #E5E7EB; padding-top: 20px;'>Jada Stables Management System © 2026</div>")

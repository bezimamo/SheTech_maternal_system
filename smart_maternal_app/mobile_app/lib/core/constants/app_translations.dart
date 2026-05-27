class AppTranslations {
  static String get(String key, bool isAmharic) {
    final Map<String, Map<String, String>> translations = {
      // Auth
      'sign_in': {'en': 'Sign In', 'am': 'ወደ መለያዎ ይግቡ'},
      'sign_up': {'en': 'Sign Up', 'am': 'መለያ ይመዘገቡ'},
      'email': {'en': 'Email', 'am': 'ኢሜይል'},
      'enter_your_email': {'en': 'Enter your email', 'am': 'ኢሜይልዎን ያስገቡ'},
      'password': {'en': 'Password', 'am': 'የይለፍ ቃል'},
      'enter_your_password': {'en': 'Enter your password', 'am': 'የይለፍ ቃልዎን ያስገቡ'},
      'forgot_password': {'en': 'Forgot Password?', 'am': 'የይለፍ ቃል ረሳዎ?'},
      'welcome_back': {'en': 'Welcome Back', 'am': 'እንኳን በደህና መጡ'},
      'sign_in_to_continue': {'en': 'Sign in to continue', 'am': 'ለመቀጠል ይግቡ'},
      'login_successful': {'en': 'Login successful', 'am': 'መግባት በተሳካ ሁኔታ ተከናውኗል'},
      'login_failed': {'en': 'Login failed', 'am': 'መግባት አልተሳካም'},
      
      // Landing
      'official_health_system': {'en': 'Official Health System', 'am': 'ኦፊሴላዊ ስርዓት'},
      'smart_maternal_health_system': {'en': 'Smart Maternal\nHealth System', 'am': 'ብልህ የእናቶች ጤና ስርዓት'},
      'landing_subtitle': {'en': 'Supporting mothers & babies through\nsafe pregnancy and child healthcare.', 'am': 'ደህንነቱ የተጠበቀ እርግዝና እና የሕፃናት ጤና አጠባበቅ ድጋፍ'},
      'mothers': {'en': 'Mothers', 'am': 'እናቶች'},
      'safe_births': {'en': 'Safe Births', 'am': 'ደህንነት'},
      'support_24_7': {'en': '24/7 Support', 'am': 'ድጋፍ'},
      'key_features': {'en': 'Key Features', 'am': 'ዋና ባህሪያት'},
      'anc_tracking': {'en': 'ANC Tracking', 'am': 'ቀጠሮ ክትትል'},
      'anc_tracking_desc': {'en': 'Track all your prenatal visits', 'am': 'ሁሉም ቀጠሮዎችዎን ይከታተሉ'},
      'vaccine_reminders': {'en': 'Vaccine Reminders', 'am': 'ክትባት ማሳወቂያ'},
      'vaccine_reminders_desc': {'en': 'Never miss baby\'s immunizations', 'am': 'ለልጅዎ ክትባቶች ማሳወቂያ ያግኙ'},
      'emergency_sos': {'en': 'Emergency SOS', 'am': 'አደጋ ጊዜ ድጋፍ'},
      'emergency_sos_desc': {'en': 'Quick access to urgent support', 'am': 'ፈጣን የጤና ድጋፍ ያግኙ'},
      'child_growth': {'en': 'Child Growth', 'am': 'ሕፃን ዕድገት'},
      'child_growth_desc': {'en': 'Monitor your baby\'s development', 'am': 'የልጅዎን ዕድገት ይከታተሉ'},
      'your_health_journey_starts_here': {'en': 'Your health journey starts here 💖', 'am': 'የጤና ጉዞዎ እዚህ ይጀምራል 💖'},
      
      // Dashboard
      'hello': {'en': 'Hello,', 'am': 'ሰላም,'},
      'verified_mother_profile': {'en': 'Verified Mother Profile', 'am': 'የተረጋገጠ የእናት መገለጫ'},
      'your_journey': {'en': 'Your Journey', 'am': 'ጉዞዎ'},
      'week': {'en': 'Week', 'am': 'ሳምንት'},
      'due_date': {'en': 'Due Date', 'am': 'የትውልድ ቀን'},
      'tbd': {'en': 'TBD', 'am': 'ይታወቃል'},
      'next_appointment': {'en': 'Next Appointment', 'am': 'ቀጣይ ቀጠሮ'},
      'schedule_pending': {'en': 'Schedule pending', 'am': 'መዘጋጀት በመጠበቅ ላይ'},
      'quick_actions': {'en': 'Quick Actions', 'am': 'ፈጣን ተግባራት'},
      'appointments': {'en': 'Appointments', 'am': 'ቀጠሮዎች'},
      'child_growth': {'en': 'Child Growth', 'am': 'ሕፃን ዕድገት'},
      'vaccinations': {'en': 'Vaccinations', 'am': 'ክትባቶች'},
      'danger_signs': {'en': 'Danger Signs', 'am': 'አደጋ ተከታታይ ምልክቶች'},
      'referrals': {'en': 'Referrals', 'am': 'ማጓጓዣዎች'},
      'my_profile': {'en': 'My Profile', 'am': 'የእኔ መገለጫ'},
      'mama_insight': {'en': 'Mama Insight', 'am': 'እናት ግንዛቤ'},
      'health_tip_default': {'en': 'Your baby is now the size of a small melon! Keep nourishing your body with iron-rich foods like spinach and lean meats.', 'am': 'ልጅዎ አሁን ትንሽ ሐብሐብ ነው! እንደ ስፒናች እና ስስ ስጋ ባሉ በብረት የበለጸጉ ምግቦች ሰውነታችሁን ይመግቡ!'},
      
      // Common
      'loading': {'en': 'Loading...', 'am': 'በመጫን ላይ...'},
      'error': {'en': 'Error', 'am': 'ስህተት'},
      'retry': {'en': 'Retry', 'am': 'ደገም ይሞክሩ'},
      'no_data': {'en': 'No data available', 'am': 'ምንም መረጃ የለም'},
      
      // Profile
      'profile': {'en': 'Profile', 'am': 'መገለጫ'},
      'edit_profile': {'en': 'Edit Profile', 'am': 'መገለጫዎን አርም'},
      'my_profile': {'en': 'My Profile', 'am': 'የእኔ መገለጫ'},
      'name': {'en': 'Name', 'am': 'ስም'},
      'phone': {'en': 'Phone', 'am': 'ስልክ'},
      'email': {'en': 'Email', 'am': 'ኢሜይል'},
      
      // Child Growth
      'child_growth': {'en': 'Child Growth', 'am': 'ሕፃን ዕድገት'},
      'weight': {'en': 'Weight', 'am': 'ክብደት'},
      'height': {'en': 'Height', 'am': 'ቁመት'},
      'age': {'en': 'Age', 'am': 'ዕድሜ'},
      
      // Appointments
      'maternal_vaccination': {'en': 'Maternal Vaccination', 'am': 'የእናት ክትባት'},
      'child_vaccination': {'en': 'Child Vaccination', 'am': 'የልጅ ክትባት'},
      'upcoming_appointments': {'en': 'Upcoming Appointments', 'am': 'የሚመጡ ቀጠሮዎች'},
      'no_upcoming_appointments': {'en': 'No upcoming appointments', 'am': 'ምንም የሚመጡ ቀጠሮዎች የሉም'},
      'view_details': {'en': 'View Details', 'am': 'ዝርዝሮችን ይመልከቱ'},
      
      // Danger Signs
      'danger_signs': {'en': 'Danger Signs', 'am': 'አደጋ ተከታታይ ምልክቶች'},
      'what_to_do': {'en': 'What to Do', 'am': 'ምን ማድረግ እንዳለብዎት'},
      'emergency_contacts': {'en': 'Emergency Contacts', 'am': 'የአደጋ ጊዜ ግንኙነቶች'},
      'ethiopian_national_emergency_services': {'en': 'Ethiopian National Emergency Services', 'am': 'የኢትዮጵያ ብሔራዊ የአደጋ ጊዜ አገልግሎቶች'},
      'your_health_facility': {'en': 'Your Health Facility', 'am': 'የእርስዎ ጤና ተቋም'},
      'national_emergency': {'en': 'National Emergency', 'am': 'ብሔራዊ አደጋ'},
      'ambulance_red_cross': {'en': 'Ambulance (Red Cross)', 'am': 'አምቡላንስ (ቀይ መስቀል)'},
      'health_info_line': {'en': 'Health Info Line', 'am': 'የጤና መረጃ መስመር'},
      'police': {'en': 'Police', 'am': 'ፖሊስ'},
      'close': {'en': 'Close', 'am': 'ይዝጉ'},
      
      // Referrals
      'my_referrals': {'en': 'My Referrals', 'am': 'የእኔ ማጓጓዣዎች'},
      'view_details': {'en': 'View Details', 'am': 'ዝርዝሮችን ይመልከቱ'},
    };

    final Map<String, String>? lang = translations[key];
    if (lang == null) return key;
    return isAmharic ? (lang['am'] ?? key) : (lang['en'] ?? key);
  }
}

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os
import re

CSV_PATH = 'internships.csv'

# Cache
_internships_df = None
_tfidf_vectorizer = None
_tfidf_matrix = None


# -------------------- HELPERS --------------------

def get_numeric_val(val_str, default=0):
    if pd.isna(val_str):
        return default
    match = re.search(r'\d+', str(val_str))
    if match:
        return int(match.group())
    return default


def split_skills(text):
    """Split skills using multiple separators"""
    return [
        s.strip().lower()
        for s in re.split(r'[,/| ]+', str(text))
        if s.strip()
    ]


def skill_match(us, rs):
    """Flexible skill comparison"""
    if us == rs:
        return 1.0
    elif us in rs or rs in us:
        return 0.8
    return 0.0


# -------------------- LOAD DATA --------------------

def load_data():
    global _internships_df, _tfidf_vectorizer, _tfidf_matrix

    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"{CSV_PATH} not found")

    df = pd.read_csv(CSV_PATH)
    df.fillna("", inplace=True)

    # Filter expired based on user requirement (2026-03-23)
    today = "2026-03-23"
    
    # Convert dates to datetime for comparison
    df['Last Date for Application'] = pd.to_datetime(df['Last Date for Application'], errors='coerce')
    df['Start Date'] = pd.to_datetime(df['Start Date'], errors='coerce')
    
    # Keep only those not started or expired
    mask = (df['Last Date for Application'] >= today) & (df['Start Date'] >= today)
    _internships_df = df[mask].copy()
    
    # CRITICAL: Reset index so it matches the TF-IDF matrix positions
    _internships_df.reset_index(drop=True, inplace=True)
    
    # Convert back to strings for JSON/UI
    _internships_df['Last Date for Application'] = _internships_df['Last Date for Application'].dt.strftime('%Y-%m-%d')
    _internships_df['Start Date'] = _internships_df['Start Date'].dt.strftime('%Y-%m-%d')
    _internships_df.fillna("Ongoing", inplace=True)

    _tfidf_vectorizer = TfidfVectorizer(
        stop_words='english',
        token_pattern=r"(?u)\b[\w\+\#\.-]+\b"
    )

    _tfidf_matrix = _tfidf_vectorizer.fit_transform(
        _internships_df['Required skills']
    )

    print(f"Loaded {_internships_df.shape[0]} internships (current as of {today})")


# -------------------- MAIN FUNCTION --------------------

def get_recommendations(user_profile, top_n=20):
    global _internships_df, _tfidf_vectorizer, _tfidf_matrix

    if _internships_df is None:
        load_data()

    # -------- USER INPUT --------
    user_skills = str(user_profile.get('skills', '')).strip()
    user_work_mode = str(user_profile.get('work_mode', '')).strip().lower()
    if user_work_mode == 'offline': user_work_mode = 'office'
    user_location = str(user_profile.get('location', '')).strip().lower()
    min_stipend = get_numeric_val(user_profile.get('stipend', '0'), 0)
    fees_str = str(user_profile.get('fees', ''))
    max_fees = int(fees_str) if fees_str.isdigit() else float('inf')
    user_skills_list = split_skills(user_skills)

    # -------- DATA COLLECTION --------
    all_to_score = []
    
    # 1. Add CSV Internships
    user_tfidf = _tfidf_vectorizer.transform([user_skills])
    cosine_sim = cosine_similarity(user_tfidf, _tfidf_matrix)[0]
    
    for idx, row in _internships_df.iterrows():
        d = row.to_dict()
        d['_tfidf_score'] = float(cosine_sim[idx])
        d['is_db'] = False
        all_to_score.append(d)
        
    # 2. Add DB Internships
    try:
        from database import get_db_connection
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT ai.*, c.company_name as company_name_db 
            FROM added_internships ai
            JOIN companies c ON ai.company_id = c.id
            WHERE ai.status = 'active'
        ''').fetchall()
        conn.close()
        
        for r in rows:
            d = dict(r)
            mapped = {
                'Internship title': d['internship_title'],
                'Name of company': d['company_name_db'],
                'Location': d['location'],
                'Required skills': d['required_skills'],
                'Duration': d['duration'],
                'Work mode': d['work_mode'],
                'Stipend': d['stipend'],
                'Fees': d['fees'],
                'Brief description': d['brief_description'],
                'is_db': True,
                'db_id': d['id'],
                '_tfidf_score': 0.0 # Will calc if needed, or just use keyword match
            }
            # Simple manual TF-IDF-like score for DB items since they aren't in the matrix
            # Or we could just use the overlap_ratio logic which handles them fine
            all_to_score.append(mapped)
    except Exception as e:
        print(f"Error loading DB internships: {e}")

    recommended = []

    for item in all_to_score:
        score = 0.0

        # -------- SKILLS MATCH --------
        tfidf_score = item.get('_tfidf_score', 0.0)
        req_skills_raw = item.get('Required skills', '')
        req_skills_list = split_skills(req_skills_raw)

        overlap_score = 0
        for us in user_skills_list:
            best = 0
            for rs in req_skills_list:
                best = max(best, skill_match(us, rs))
            overlap_score += best

        overlap_ratio = overlap_score / len(user_skills_list) if user_skills_list else 0
        multi_bonus = min(1.0, overlap_score / len(user_skills_list)) if user_skills_list else 0

        combined_skill_match = (overlap_ratio * 0.6) + (tfidf_score * 0.3) + (multi_bonus * 0.1)
        if overlap_score == 0: combined_skill_match *= 0.3

        score += combined_skill_match * 50.0

        # -------- WORK MODE --------
        item_wm = str(item.get('Work mode', '')).lower()
        if not user_work_mode or user_work_mode == 'any': score += 10
        elif user_work_mode in item_wm: score += 10

        # -------- LOCATION --------
        item_loc = str(item.get('Location', '')).lower()
        if not user_location: score += 15
        elif user_location in item_loc: score += 15
        elif 'wfh' in item_wm or 'wfh' in item_loc: score += 15

        # -------- STIPEND --------
        item_stipend = get_numeric_val(item.get('Stipend', '0'), 0)
        if item_stipend >= min_stipend: score += 15
        elif min_stipend > 0: score += 15 * (item_stipend / min_stipend)

        # -------- FEES --------
        item_fees = get_numeric_val(item.get('Fees', '0'), 0)
        if item_fees <= max_fees: score += 10

        match_percent = round(score, 2)
        if match_percent > 2:
            item['match_percent'] = match_percent
            recommended.append(item)

    # -------- SORT --------
    recommended.sort(key=lambda x: x['match_percent'], reverse=True)
    return recommended[:top_n]



# -------------------- TEST --------------------

if __name__ == "__main__":
    load_data()

    test_user = {
        'skills': 'Python Machine Learning NLP',
        'work_mode': 'WFH',
        'location': '',
        'stipend': '0',
        'fees': '0'
    }

    recs = get_recommendations(test_user, 10)

    for r in recs:
        print(f"[{r['match_percent']}%] {r['Internship title']} at {r['Name of company']}")
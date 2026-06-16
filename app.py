import os
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for the release notes
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 600  # 10 minutes cache duration

def parse_updates(entry):
    """
    Parse a single feed entry and split it into individual updates based on <h3> tags.
    """
    soup = BeautifulSoup(entry.summary, 'html.parser')
    h3_tags = soup.find_all('h3')
    updates = []
    
    # Extract entry date
    date_str = entry.title if 'title' in entry else 'Unknown Date'
    link = entry.link if 'link' in entry else 'https://docs.cloud.google.com/bigquery/docs/release-notes'
    
    if not h3_tags:
        # Fallback if there are no <h3> tags (treat the whole summary as one general update)
        text_content = soup.get_text().strip()
        updates.append({
            "id": f"{entry.id}_0" if 'id' in entry else f"gen_{hash(date_str)}_0",
            "date": date_str,
            "link": link,
            "type": "Update",
            "content_html": str(entry.summary),
            "content_text": text_content
        })
        return updates
        
    for idx, h3 in enumerate(h3_tags):
        update_type = h3.get_text().strip()
        content_parts = []
        sibling = h3.next_sibling
        while sibling and sibling.name != 'h3':
            content_parts.append(str(sibling))
            sibling = sibling.next_sibling
            
        html_content = "".join(content_parts).strip()
        text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
        
        updates.append({
            "id": f"{entry.id}_{idx}" if 'id' in entry else f"gen_{hash(date_str)}_{idx}",
            "date": date_str,
            "link": link,
            "type": update_type,
            "content_html": html_content,
            "content_text": text_content
        })
    return updates

def fetch_and_parse_feed():
    """
    Fetch the feed from the URL and parse entries into a list of individual updates.
    """
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
    except Exception as e:
        # Fallback to feedparser direct fetch if requests fails
        try:
            feed = feedparser.parse(FEED_URL)
        except Exception as ex:
            raise Exception(f"Failed to fetch feed: {str(ex)}")
            
    if hasattr(feed, 'bozo') and feed.bozo:
        # Note: bozo is sometimes set for minor XML issues that don't prevent parsing.
        # So we only fail if we got no entries at all.
        if not feed.entries:
            raise Exception(f"Failed to parse XML feed: {feed.bozo_exception}")

    all_updates = []
    for entry in feed.entries:
        entry_updates = parse_updates(entry)
        all_updates.extend(entry_updates)
        
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache["data"] or (current_time - cache["last_fetched"] > CACHE_DURATION):
        try:
            updates = fetch_and_parse_feed()
            cache["data"] = updates
            cache["last_fetched"] = current_time
            return jsonify({
                "success": True,
                "source": "network",
                "timestamp": current_time,
                "data": updates
            })
        except Exception as e:
            # If fetch fails, return cached data if available, else error
            if cache["data"]:
                return jsonify({
                    "success": True,
                    "source": "cache_fallback",
                    "error_msg": str(e),
                    "timestamp": cache["last_fetched"],
                    "data": cache["data"]
                })
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500
            
    return jsonify({
        "success": True,
        "source": "cache",
        "timestamp": cache["last_fetched"],
        "data": cache["data"]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

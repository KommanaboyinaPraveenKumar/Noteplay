# Noteplay

## What's Noteplay?

Hey there! Noteplay is a fun Chrome extension I built to make your browsing experience a bit more... musical! It reads the vibe of the webpage you’re on by analyzing its text and then plays a YouTube song or playlist that matches the mood. Feeling joyful? Maybe you’ll get some upbeat tunes. Page giving off sad vibes? It’ll pick something more mellow. It’s powered by a cool sentiment analysis model (`j-hartmann/emotion-english-distilroberta-base`) running on a FastAPI backend, and you can even tweak playlists to match your taste.

## What Can It Do?

- **Mood Detection**: Scans webpage text to figure out emotions like joy, sadness, anger, fear, surprise, love, neutral, or disgust.
- **Music That Matches**: Opens a YouTube video or playlist based on the detected mood.
- **Playlist Customization**: Add or remove YouTube links for each emotion, saved right in Chrome’s local storage.
- **Mood Tracker**: Shows you a daily summary of your browsing moods with neat little badges and a list of pages you visited.
- **Sleek Popup**: A neon-themed interface with tabs to manage playlists or check your daily mood.
- **Skip Google Searches**: Smart enough to ignore Google search pages since they’re not super mood-relevant.

## Getting Started

### What You’ll Need
- Python 3.8+ (for the backend)
- Chrome browser
- A YouTube Data API v3 key (you’ll add this in the code)
- Optionally, Node.js if you’re tinkering with the frontend

### Setup Steps
1. **Grab the Code**:
   ```bash
   git clone https://github.com/KommanaboyinaPraveenKumar/Noteplay.git
   ```

2. **Set Up the Backend**:
   - Install the Python stuff:
     ```bash
     pip install fastapi uvicorn torch transformers pydantic
     ```
   - Fire up the FastAPI server (make sure the API code is in a file called `main.py`):
     ```bash
     uvicorn Noteplay_api:app --host 127.0.0.1 --port 8000
     ```

3. **Add Your YouTube API Key**:
   - Open `popup.js` and swap out the `apiKey` with your own from [Google Cloud Console](https://console.cloud.google.com/). This lets Noteplay fetch YouTube video/playlist info.

4. **Load the Extension in Chrome**:
   - Go to `chrome://extensions/` in Chrome.
   - Turn on “Developer mode” (top-right switch).
   - Hit “Load unpacked” and pick the `extension` folder.
   - Keep that FastAPI server running, or the extension won’t know what to do!

## How to Use It

1. **Open the Popup**:
   - Click the Noteplay icon in Chrome. You’ll see a slick popup with two tabs: **Playlist** and **Mood of the Day**.

2. **Playlist Tab**:
   - **Start**: Click to analyze the current webpage’s text and play a YouTube song or playlist that matches its mood. (It skips Google search pages, don’t worry.)
   - **Stop**: Closes the music tab and updates the status.
   - **Edit Playlist**: Pick an emotion, add a YouTube link, or delete one. Your changes stick thanks to Chrome’s local storage.
   - Check out your playlists with thumbnails pulled straight from YouTube.

3. **Mood of the Day Tab**:
   - See the top mood of the day with a cool badge (like a smiley for joy or a frowny for sadness).
   - Scroll through a list of pages you visited today and their moods (neutral ones get filtered out).
   - Hit “Clear History” to wipe the mood data if you want a fresh start.

## What’s in the Code?

- `Noteplay_api.py`: The FastAPI backend that handles sentiment analysis with the transformer model.
- `background.js`: Talks to the backend and saves mood data in Chrome’s storage.
- `content.js`: Grabs the text from webpages for analysis.
- `popup.html`: The HTML for the popup with its neon-styled interface.
- `popup.js`: Powers the popup, letting you manage playlists and view mood summaries.
- `popup.css`: Styles the popup with that sweet neon look (not shared here, but it’s referenced).

## Wanna Help Out?

I’d love for you to jump in and make Noteplay even cooler! Here’s how:
1. Fork this repo.
2. Create a branch (`git checkout -b feature/your-cool-idea`).
3. Make your changes and commit (`git commit -m "Added my cool idea"`).
4. Push it up (`git push origin feature/your-cool-idea`).
5. Open a pull request, and I’ll check it out!

Just try to keep the code clean and maybe add a test or two if you can.


## Got Questions?

Drop an issue on GitHub, and I’ll get back to you as soon as I can!

## Heads-Up

- Make sure the FastAPI server is running at `http://127.0.0.1:8000` when you use the extension.
- The YouTube API has quota limits, so you might hit a wall (HTTP 403) if you fetch too many thumbnails.
- If you add a bunk YouTube URL, it’ll show up as an error in the playlist view.

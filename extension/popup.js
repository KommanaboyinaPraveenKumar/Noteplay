let ytlinks = {}; // Start empty

function loadPlaylists(callback) {
    const defaultLinks = {
        "joy": ["https://youtu.be/LBNWehxbS2M?si=3sqe-f1oD6Uci1T7"],
    "sadness": ["https://youtu.be/BZsXcc_tC-o?si=zh77CjWX1dC46QWO"],
    "anger": ["https://youtu.be/Qt5wB7KXSaM?si=_Ci3pwVS7FfQtbEt"],
    "fear": ["https://music.youtube.com/watch?v=8njnTRKGdYw&si=YAo3Kvsr3bOOL29o"],
    "surprise": ["https://youtu.be/y1yNk8VeqqI?si=toHFxxJxHop0xttc"],
    "love": ["https://music.youtube.com/playlist?list=OLAK5uy_nAF_sXI8U1xc8DjaTMUcf7v1BTxYfCQTQ&si=x4wm-0WUBWsDxTO_"],
    "neutral": ["https://youtu.be/po1pHx9eSm4?si=NsXmLI4gi--p4u8S"],
    "disgust": ["https://music.youtube.com/playlist?list=PLeLX7phiUOdomyHtTjuZUwtANxBjRwaF_&si=fG-Qmlh0ats0riOE"]
    };
    chrome.storage.local.get({ ytlinks: defaultLinks }, (data) => {
        ytlinks = data.ytlinks;
        if (callback) callback();
    });
}

function startMusic() {
    console.log("Start button clicked"); // Debug log
    document.getElementById("loading").classList.add("active");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        console.log("Current tab:", tab.url); // Debug log
        // Use the same method as automatic analysis - get text directly from content script
        chrome.tabs.sendMessage(tab.id, { action: "getPageText" }, (response) => {
            if (chrome.runtime.lastError || !response) {
                console.log("Error getting page text:", chrome.runtime.lastError); // Debug log
                document.getElementById("sentiment").textContent = "Could not get page text. Try a different tab.";
                document.getElementById("loading").classList.remove("active");
                return;
            } else {
                const text = response.text;
                console.log("Text being analyzed:", text.substring(0, 200) + "..."); // Debug log
                console.log("Text length:", text.length); // Debug log
                
                // Check if it's a Google search page first
                const url = new URL(tab.url);
                const isGoogleSearch = url.hostname.includes('google.com') && 
                                    (url.pathname.includes('/search') || url.searchParams.has('q'));
                
                if (isGoogleSearch) {
                    document.getElementById("sentiment").textContent = "Skipping Google search page.";
                    document.getElementById("loading").classList.remove("active");
                    return;
                }
                
                fetch("http://127.0.0.1:8000/analyze", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ text: text })
                })
                .then(res => res.json())
                .then(data => {
                    const mood = data.sentiment.toLowerCase();
                    document.getElementById("sentiment").textContent = `Mood: ${mood}`;
                    document.getElementById("loading").classList.remove("active");
                    const playlist = ytlinks[mood] || ytlinks["neutral"];
                   const randomIndex = Math.floor(Math.random() * playlist.length);
chrome.tabs.create({ url: playlist[randomIndex], active: false });
                }).catch(error => {
                    console.error("Error:", error);
                    document.getElementById("sentiment").textContent = "Error analyzing mood.";
                    document.getElementById("loading").classList.remove("active");
                });
            }
        });
    });
}

function stopMusic() {
    document.getElementById("sentiment").textContent = "Stopped.";
}

async function renderPlaylist(emotion = "joy") {
    const playlistDiv = document.getElementById("playlist");
    playlistDiv.innerHTML = `
        <label>Emotion: </label>
        <select id="selection">
            ${Object.entries({
                joy: "Joy",
                sadness: "Sadness",
                anger: "Anger", 
                fear: "Fear",
                surprise: "Surprise",
                love: "Love",
                neutral: "Neutral",
                disgust: "Disgust"
            }).map(([value, text]) => 
                `<option value="${value}" ${value === emotion ? 'selected' : ''}>${text}</option>`
            ).join('')}
        </select>
        <input type="text" class="input" id="playlisturl" placeholder="Enter playlist URL" />
        <button id="addplaylist" class="btn">Add Playlist</button>
        <div id="songlist" class="playlist-container"></div>
    `;

    document.getElementById("selection").value = emotion;

   
    await renderPlaylistItems(emotion);

   
    document.getElementById("addplaylist").addEventListener("click", () => {
        const url = document.getElementById("playlisturl").value.trim();
        if (url && isValidYouTubeUrl(url)) {
            if (!ytlinks[emotion]) ytlinks[emotion] = [];
            ytlinks[emotion].push(url);
            savePlaylists();
            renderPlaylistItems(emotion);
            document.getElementById("playlisturl").value = "";
        } else {
            alert("Please enter a valid YouTube URL!");
        }
    });

    document.getElementById("selection").addEventListener("change", (e) => {
        renderPlaylist(e.target.value);
    });
}async function renderPlaylistItems(emotion) {
    const songlistDiv = document.getElementById("songlist");
    console.log("Rendering items for emotion:", emotion);
    console.log("Available URLs:", ytlinks[emotion]);

    songlistDiv.innerHTML = ytlinks[emotion]?.length 
        ? "" 
        : "<p style='color: #33f5c3; text-align: center;'>No playlists or videos for this emotion yet.</p>";

    if (!ytlinks[emotion]) return;

    for (const [index, url] of ytlinks[emotion].entries()) {
        const itemDiv = document.createElement("div");
        itemDiv.className = "playlist-item";

        try {
            console.log("Processing URL:", url);
            const info = await getYouTubePlaylistInfo(url);
            console.log("YouTube info:", info);

            const isVideo = url.match(/[?&]v=/) || url.match(/^https?:\/\/youtu\.be\//);
            const typeLabel = isVideo ? "Video" : "Playlist";

            if (info && info.thumbnail) {
                itemDiv.innerHTML = `
                    <img src="${info.thumbnail}" alt="${typeLabel} thumbnail" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA2MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjMzMzMzMzIi8+Cjx0ZXh0IHg9IjMwIiB5PSIyMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+${typeLabel}</L3RleHQ+Cjwvc3ZnPgo='">
                    <div class="playlist-info">
                        <h4>${info.title || `Untitled ${typeLabel}`}</h4>
                        <p>${typeLabel}</p>
                    </div>
                    <button class="del btn" data-index="${index}">Delete</button>
                `;
            } else {
                itemDiv.innerHTML = `
                    <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA2MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjZmY0NDQ0Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIyMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW52YWxpZDwvdGV4dD4KPC9zdmc+Cg==" alt="Invalid ${typeLabel.toLowerCase()}">
                    <div class="playlist-info">
                        <h4>Invalid ${typeLabel} URL</h4>
                        <p>${url}</p>
                    </div>
                    <button class="del btn" data-index="${index}">Delete</button>
                `;
            }
        } catch (error) {
            console.error("Error rendering item:", error);
            const isVideo = url.match(/[?&]v=/) || url.match(/^https?:\/\/youtu\.be\//);
            const typeLabel = isVideo ? "Video" : "Playlist";
            let errorMessage = "Error Loading " + typeLabel;
            if (error.message.includes("403")) {
                errorMessage = typeLabel + " (API Quota Exceeded)";
            } else if (error.message.includes("404")) {
                errorMessage = "Invalid " + typeLabel + " ID";
            }
            itemDiv.innerHTML = `
                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA2MCA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ1IiBmaWxsPSIjZmY0NDQ0Ii8+Cjx0ZXh0IHg9IjMwIiB5PSIyMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RXJyb3I8L3RleHQ+Cjwvc3ZnPgo=" alt="Error">
                <div class="playlist-info">
                    <h4>${errorMessage}</h4>
                    <p>${url}</p>
                </div>
                <button class="del btn" data-index="${index}">Delete</button>
            `;
        }

        songlistDiv.appendChild(itemDiv);
    }

    document.querySelectorAll(".del.btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.getAttribute("data-index"));
            ytlinks[emotion].splice(index, 1);
            savePlaylists();
            renderPlaylistItems(emotion);
        });
    });
}
function editplaylist() {
    renderPlaylist("joy"); 
}

function savePlaylists() {
    chrome.storage.local.set({ ytlinks });
}

function isValidYouTubeUrl(url) {
    const playlistRegExp = /[?&]list=([^&]+)/;
    const videoRegExp = /[?&]v=([^&]+)/;
    const youtuBeRegExp = /^https?:\/\/youtu\.be\/([^\/?&]+)/;
    return (playlistRegExp.test(url) && url.match(playlistRegExp)[1]) || 
           (videoRegExp.test(url) && url.match(videoRegExp)[1]) ||
           (youtuBeRegExp.test(url) && url.match(youtuBeRegExp)[1]);
}async function getYouTubePlaylistInfo(url) {
    const playlistRegExp = /[?&]list=([^&]+)/;
    const videoRegExp = /[?&]v=([^&]+)/;
    const youtuBeRegExp = /^https?:\/\/youtu\.be\/([^\/?&]+)/;
    const playlistMatch = url.match(playlistRegExp);
    const playlistId = playlistMatch ? playlistMatch[1] : null;
    const videoMatch = url.match(videoRegExp);
    const youtuBeMatch = url.match(youtuBeRegExp);
    const videoId = videoMatch ? videoMatch[1] : (youtuBeMatch ? youtuBeMatch[1] : null);

    if (!playlistId && !videoId) return null;

    const apiKey = 'AIzaSyCt0ALzhlMv1-drGehgjUPS47MAYMXgkys';

    try {
        if (playlistId) {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const { title, thumbnails } = data.items[0].snippet;
                return {
                    title,
                    thumbnail: thumbnails.standard?.url || thumbnails.default?.url
                };
            }
        }

        if (videoId) {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                const { title, thumbnails } = data.items[0].snippet;
                return {
                    title,
                    thumbnail: thumbnails.standard?.url || thumbnails.default?.url
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching YouTube info:', error);
        throw error; // Re-throw to allow renderPlaylistItems to handle specific errors
    }
}
function renderMoodOfTheDay() {
  const moodSummaryDiv = document.getElementById('mood-summary');
  const moodVisitsDiv = document.getElementById('mood-visits');
  moodSummaryDiv.innerHTML = '<p>Loading mood data...</p>';
  moodVisitsDiv.innerHTML = '';

  chrome.storage.local.get({ visits: [] }, (result) => {
    const visits = result.visits || [];
    if (!visits.length) {
      moodSummaryDiv.innerHTML = '<p style="font-size:25px;">No mood data for today yet.</p>';
      return;
    }
    
    const today = new Date().toISOString().slice(0, 10);
    const todayVisits = visits.filter(v => {
      const d = new Date(v.timestamp).toISOString().slice(0, 10);
      return d === today;
    });
    if (!todayVisits.length) {
      moodSummaryDiv.innerHTML = '<p style="font-size:25px;">No mood data for today yet.</p>';
      return;
    }
   
    const emotionCounts = {};
    todayVisits.forEach(v => {
      if (v.emotion !== 'neutral') {
        emotionCounts[v.emotion] = (emotionCounts[v.emotion] || 0) + 1;
      }
    });
   
    let max = 0, overall = 'neutral';
    for (const [emotion, count] of Object.entries(emotionCounts)) {
      if (count > max) {
        max = count;
        overall = emotion;
      }
    }
    
    const badgeMap = {
      joy: 'joy.webp',
      sadness: 'sadness.webp', 
      anger: 'angry.webp',
      fear: 'fear.webp',
      surprise: 'Surprise.webp',
      love: 'love.webp',
      neutral: 'neutral.webp',
      disgust: 'disgust.webp'
    };
   
    moodSummaryDiv.innerHTML = `
      <div class="overall-mood-display">
        <img src="${badgeMap[overall] || 'neutral.webp'}" alt="${overall}" class="overall-mood-badge">
        <span style="font-size: 18px;"><strong>Today's Overall Mood:</strong> ${capitalize(overall)}</span>
      </div>
    `;
  
    moodVisitsDiv.innerHTML = `
      <h4 style="font-size: 16px; margin-bottom: 12px;">Pages Visited Today:</h4>
      <ul style="max-height:120px;overflow:auto;padding-left:0;">
        ${todayVisits.filter(v => v.emotion !== 'neutral').map(v => 
          `<li class="mood-summary-item" style="margin-bottom:6px;list-style:none;font-size:14px;">
            <img src="${badgeMap[v.emotion] || 'neutral.webp'}" alt="${v.emotion}" class="emotion-badge">
            <span title="${v.url}">${truncateUrl(v.url)}</span>
          </li>`
        ).join('')}
      </ul>
    `;
  });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function truncateUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 20) + (u.pathname.length > 20 ? '…' : '');
  } catch {
    return url.slice(0, 30) + (url.length > 30 ? '…' : '');
  }
}

document.addEventListener("DOMContentLoaded", function() {
    loadPlaylists(() => {
        document.getElementById("start").addEventListener("click", startMusic);
        document.getElementById("stop").addEventListener("click", stopMusic);
        document.getElementById("editplaylist").addEventListener("click", editplaylist);
    });
    
    const tabPlaylist = document.getElementById('tab-playlist');
    const tabMood = document.getElementById('tab-mood');
    const playlistSection = document.getElementById('playlist-section');
    const moodSection = document.getElementById('mood-section');
    
    if (tabPlaylist && tabMood && playlistSection && moodSection) {
        tabPlaylist.addEventListener('click', () => {
            tabPlaylist.classList.add('active');
            tabMood.classList.remove('active');
            playlistSection.style.display = 'block';
            moodSection.style.display = 'none';
        });
        
        tabMood.addEventListener('click', () => {
            tabMood.classList.add('active');
            tabPlaylist.classList.remove('active');
            playlistSection.style.display = 'none';
            moodSection.style.display = 'block';
            renderMoodOfTheDay(); 
        });
    }
    
    
    renderMoodOfTheDay();
    
    const clearBtn = document.getElementById('clear-mood-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        if (confirm('Clear all mood history?')) {
          chrome.storage.local.set({ visits: [] }, () => {
            renderMoodOfTheDay();
          });
        }
      });
    }
});

const tabPlaylist = document.getElementById('tab-playlist');
const tabMood = document.getElementById('tab-mood');
const playlistSection = document.getElementById('playlist-section');
const moodSection = document.getElementById('mood-section');

if (tabPlaylist && tabMood && playlistSection && moodSection) {
  tabPlaylist.addEventListener('click', () => {
    tabPlaylist.classList.add('active');
    tabMood.classList.remove('active');
    playlistSection.style.display = '';
    moodSection.style.display = 'none';
  });
  tabMood.addEventListener('click', () => {
    tabMood.classList.add('active');
    tabPlaylist.classList.remove('active');
    playlistSection.style.display = 'none';
    moodSection.style.display = '';
    if (typeof renderMoodOfTheDay === 'function') renderMoodOfTheDay();
  });
}
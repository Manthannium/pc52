# PC-52 Games
Free online real-time multiplayer card games

### Deployment
- Frontend - 
- Backend -

### Local developement
```sh
# start server
cd server
npm install
npm run dev
npm run start 

# start client
cd client
npm install
npm run dev
npm run start
```

### Project structure
```
.
├── client
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── public
│   ├── src
│   │   ├── App.jsx
│   │   ├── components
│   │   │   ├── Card.jsx
│   │   │   ├── GameOver.jsx
│   │   │   ├── GameTable.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Lobby.jsx
│   │   │   └── PlayerList.jsx
│   │   ├── main.jsx
│   │   ├── socket.js
│   │   └── styles.css
│   └── vite.config.js
├── README.md
├── .gitignore
└── server
    ├── gameLogic.js
    ├── index.js
    ├── package-lock.json
    └── package.json
```
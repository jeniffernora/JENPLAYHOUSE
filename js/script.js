"use strict";

/* =========================================================
   JENIFFER NORA WEBSITE
   FULL AUTOMATIC GOOGLE SHEETS CMS
========================================================= */

const CONFIG = window.JENIFFER_CONFIG || {};
const SHEETS = CONFIG.sheets || {};


/* =========================================================
   HELPERS
========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function safe(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizeStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase();
}

function isPublished(status) {
    return normalizeStatus(status) === "published";
}

function isComingSoon(status) {
    return normalizeStatus(status) === "coming soon";
}

function isSoldOut(status) {
    return normalizeStatus(status) === "sold out";
}

function isHiddenStatus(status) {
    return [
        "draft",
        "hidden",
        "archived"
    ].includes(
        normalizeStatus(status)
    );
}

function isVisible(status) {
    return !isHiddenStatus(status);
}

function formatMoney(
    value,
    currency = "IDR"
) {
    const number =
        Number(
            String(value || "0")
                .replace(/[^\d.-]/g, "")
        ) || 0;

    try {
        return new Intl.NumberFormat(
            "id-ID",
            {
                style: "currency",
                currency:
                    currency || "IDR",
                maximumFractionDigits: 0
            }
        ).format(number);
    }

    catch {
        return (
            "Rp" +
            number.toLocaleString(
                "id-ID"
            )
        );
    }
}

function roleplayArtist(row) {
    const artist =
        row["Roleplay Artist"] ||
        "Jeniffer Nora";

    const featured =
        row["Featured Artist"] ||
        "";

    if (!featured) {
        return artist;
    }

    const featuredLower =
        featured.toLowerCase();

    if (
        featuredLower.includes("remake")
    ) {
        return artist;
    }

    return (
        artist +
        " feat. " +
        featured
    );
}

function getLyrics(row) {
    return [
        row["Lyric 1"],
        row["Lyric 2"],
        row["Lyric 3"],
        row["Lyric 4"],
        row["Lyric 5"]
    ]
        .map(
            lyric =>
                String(
                    lyric || ""
                ).trim()
        )
        .filter(Boolean);
}

function encodeLyrics(lyrics) {
    return encodeURIComponent(
        JSON.stringify(lyrics)
    );
}

function decodeLyrics(value) {
    try {
        return JSON.parse(
            decodeURIComponent(
                value || "%5B%5D"
            )
        );
    }

    catch (error) {
        console.warn(
            "Could not read lyric options:",
            error
        );

        return [];
    }
}


/* =========================================================
   GOOGLE SHEETS CSV CMS
========================================================= */

function parseCSV(csvText) {
    const rows = [];

    let row = [];
    let cell = "";
    let insideQuotes = false;

    for (
        let index = 0;
        index < csvText.length;
        index++
    ) {
        const character =
            csvText[index];

        const nextCharacter =
            csvText[index + 1];

        if (
            character === '"' &&
            insideQuotes &&
            nextCharacter === '"'
        ) {
            cell += '"';
            index++;
        }

        else if (
            character === '"'
        ) {
            insideQuotes =
                !insideQuotes;
        }

        else if (
            character === "," &&
            !insideQuotes
        ) {
            row.push(cell);

            cell = "";
        }

        else if (
            (
                character === "\n" ||
                character === "\r"
            ) &&
            !insideQuotes
        ) {
            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                index++;
            }

            row.push(cell);

            cell = "";

            if (
                row.some(
                    value =>
                        String(value)
                            .trim() !== ""
                )
            ) {
                rows.push(row);
            }

            row = [];
        }

        else {
            cell += character;
        }
    }

    if (
        cell !== "" ||
        row.length
    ) {
        row.push(cell);

        if (
            row.some(
                value =>
                    String(value)
                        .trim() !== ""
            )
        ) {
            rows.push(row);
        }
    }

    if (!rows.length) {
        return [];
    }

    const headers =
        rows[0].map(
            header =>
                String(header)
                    .replace(
                        /^\uFEFF/,
                        ""
                    )
                    .trim()
        );

    return rows
        .slice(1)
        .map(
            row => {
                const result = {};

                headers.forEach(
                    (
                        header,
                        index
                    ) => {
                        if (!header) {
                            return;
                        }

                        result[header] =
                            String(
                                row[index] ??
                                ""
                            ).trim();
                    }
                );

                return result;
            }
        );
}


/* =========================================================
   FETCH GOOGLE SHEET CSV
========================================================= */

async function fetchSheet(
    sheetURL
) {
    if (!sheetURL) {
        throw new Error(
            "Google Sheet CSV URL is missing."
        );
    }

    const separator =
        sheetURL.includes("?")
            ? "&"
            : "?";

    const freshURL =
        sheetURL +
        separator +
        "_=" +
        Date.now();

    console.log(
        "Loading Sheet:",
        freshURL
    );

    const response =
        await fetch(
            freshURL,
            {
                method: "GET",
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            `Google Sheet returned ${response.status}`
        );
    }

    const csvText =
        await response.text();

    if (!csvText.trim()) {
        throw new Error(
            "Google Sheet returned empty data."
        );
    }

    const lowerText =
        csvText
            .trim()
            .toLowerCase();

    if (
        lowerText.startsWith(
            "<!doctype html"
        ) ||
        lowerText.startsWith(
            "<html"
        )
    ) {
        throw new Error(
            "Google Sheet returned HTML instead of CSV."
        );
    }

    const rows =
        parseCSV(
            csvText
        );

    console.log(
        "Sheet loaded:",
        rows.length,
        "rows"
    );

    return rows;
}


/* =========================================================
   NAVIGATION
========================================================= */

const menuButton =
    $("#menuButton");

const navigation =
    $("#navigation");

function closeMenu() {
    navigation?.classList.remove(
        "active"
    );

    menuButton?.classList.remove(
        "active"
    );
}

menuButton?.addEventListener(
    "click",
    () => {
        navigation?.classList.toggle(
            "active"
        );

        menuButton?.classList.toggle(
            "active"
        );
    }
);

$$(".navigation a")
    .forEach(
        link => {
            link.addEventListener(
                "click",
                closeMenu
            );
        }
    );


/* =========================================================
   MUSIC TABS
========================================================= */

$$(".music-tab")
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    const target =
                        button.dataset.target;

                    $$(".music-tab")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    $$(".music-panel")
                        .forEach(
                            panel =>
                                panel.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    $(
                        "#" + target
                    )?.classList.add(
                        "active"
                    );
                }
            );
        }
    );


/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {
    try {
        const rows =
            await fetchSheet(
                SHEETS.settings
            );

        const settings = {};

        rows
            .filter(
                row =>
                    isVisible(
                        row.Status
                    )
            )
            .forEach(
                row => {
                    settings[
                        row.Key
                    ] =
                        row.Value;
                }
            );

        if (
            settings.hero_title &&
            $("#homeTitle")
        ) {
            $("#homeTitle")
                .textContent =
                settings.hero_title;
        }

        if (
            settings.hero_description &&
            $("#homeDescription")
        ) {
            $("#homeDescription")
                .textContent =
                settings.hero_description;
        }

        if (
            settings.hero_label &&
            $("#homeLabel")
        ) {
            $("#homeLabel")
                .textContent =
                settings.hero_label;
        }

        if (
            settings.hero_image &&
            $("#homeBackground")
        ) {
            $("#homeBackground")
                .style
                .backgroundImage =
                `url("${settings.hero_image}")`;
        }
    }

    catch (error) {
        console.warn(
            "SETTINGS ERROR:",
            error
        );
    }
}


/* =========================================================
   ALBUM GROUPING
========================================================= */

function groupAlbums(rows) {
    const albums =
        new Map();

    rows
        .filter(
            row =>
                isVisible(
                    row.Status
                )
        )
        .forEach(
            row => {
                const title =
                    row[
                        "Release / Album"
                    ];

                if (!title) {
                    return;
                }

                if (
                    !albums.has(title)
                ) {
                    albums.set(
                        title,
                        {
                            order:
                                Number(
                                    row[
                                        "Release Order"
                                    ]
                                ) || 999,

                            title,

                            label:
                                row[
                                    "Release Label"
                                ] ||
                                "Album",

                            cover:
                                row[
                                    "Cover URL or Path"
                                ] ||
                                "",

                            tracks: []
                        }
                    );
                }

                const album =
                    albums.get(title);

                if (
                    !album.cover &&
                    row[
                        "Cover URL or Path"
                    ]
                ) {
                    album.cover =
                        row[
                            "Cover URL or Path"
                        ];
                }

                album.tracks.push(
                    row
                );
            }
        );

    return Array
        .from(
            albums.values()
        )
        .sort(
            (a, b) =>
                a.order -
                b.order
        );
}


/* =========================================================
   ALBUM HTML
========================================================= */

function albumHTML(
    album,
    index
) {
    const tracks =
        [...album.tracks]
            .sort(
                (a, b) =>
                    Number(
                        a[
                            "Track Number"
                        ]
                    ) -
                    Number(
                        b[
                            "Track Number"
                        ]
                    )
            );

    const coverHTML =
        album.cover

        ? `
            <div class="album-cover-placeholder">

                <img
                    src="${safe(
                        album.cover
                    )}"
                    alt="${safe(
                        album.title
                    )}"
                    loading="lazy"
                    onerror="
                        this.style.display='none'
                    "
                >

            </div>
        `

        : `
            <div class="album-cover-placeholder">
                ${safe(
                    album.title
                )}
            </div>
        `;

    const tracksHTML =
        tracks
            .map(
                track => {
                    const artist =
                        roleplayArtist(
                            track
                        );

                    const trackCover =
                        track[
                            "Cover URL or Path"
                        ] ||
                        album.cover;

                    const lyrics =
                        getLyrics(
                            track
                        );

                    const comingSoon =
                        isComingSoon(
                            track.Status
                        );

                    return `
                        <li class="track-row">

                            <button
                                class="
                                    track-play
                                    js-track-play
                                "
                                type="button"

                                data-title="${safe(
                                    track[
                                        "Song Title"
                                    ]
                                )}"

                                data-roleplay="${safe(
                                    artist
                                )}"

                                data-original="${safe(
                                    track[
                                        "Original Credit"
                                    ]
                                )}"

                                data-video="${safe(
                                    track[
                                        "YouTube Video ID"
                                    ]
                                )}"

                                data-cover="${safe(
                                    trackCover
                                )}"

                                data-lyrics="${safe(
                                    encodeLyrics(
                                        lyrics
                                    )
                                )}"

                                ${
                                    comingSoon
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    comingSoon
                                        ? "Coming Soon"
                                        : "▶"
                                }
                            </button>


                            <div class="track-copy">

                                <strong>
                                    ${safe(
                                        track[
                                            "Song Title"
                                        ]
                                    )}
                                </strong>


                                <span>
                                    ${safe(
                                        artist
                                    )}
                                </span>


                                <small>
                                    Original song by
                                    ${safe(
                                        track[
                                            "Original Credit"
                                        ]
                                    )}
                                </small>

                            </div>

                        </li>
                    `;
                }
            )
            .join("");

    return `
        <details
            class="album-card"
            ${index === 0
                ? "open"
                : ""}
        >

            <summary class="album-summary">

                <span class="album-number">
                    ${String(
                        album.order
                    ).padStart(
                        2,
                        "0"
                    )}
                </span>


                <div class="album-heading">

                    <p>
                        ${safe(
                            album.label
                        )}
                    </p>


                    <h3>
                        ${safe(
                            album.title
                        )}
                    </h3>


                    <span>
                        ${tracks.length}
                        Tracks
                    </span>

                </div>


                <span class="album-open-icon">
                    +
                </span>

            </summary>


            <div class="album-body">

                ${coverHTML}

                <ol class="track-list">
                    ${tracksHTML}
                </ol>

            </div>

        </details>
    `;
}


/* =========================================================
   LOAD ALBUMS
========================================================= */

async function loadAlbums() {
    const container =
        $("#albumList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.albums
            );

        const albums =
            groupAlbums(
                rows
            );

        container.innerHTML =
            albums.length

            ? albums
                .map(
                    albumHTML
                )
                .join("")

            : `
                <p class="loading-text">
                    No albums published yet.
                </p>
            `;
    }

    catch (error) {
        console.error(
            "ALBUM ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Albums could not be loaded.
            </p>
        `;
    }
}


/* =========================================================
   LOAD KOREAN ALBUMS
========================================================= */

async function loadKoreanAlbums() {
    const container =
        $("#koreanAlbumList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.koreanAlbums
            );

        const albums =
            groupAlbums(
                rows
            );

        container.innerHTML =
            albums.length

            ? albums
                .map(
                    albumHTML
                )
                .join("")

            : `
                <p class="loading-text">
                    No Korean releases published.
                </p>
            `;
    }

    catch (error) {
        console.error(
            "KOREAN ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Korean releases could not be loaded.
            </p>
        `;
    }
}


/* =========================================================
   LOAD SINGLES
========================================================= */

async function loadSingles() {
    const container =
        $("#singleList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.singles
            );

        const singles =
            rows
                .filter(
                    row =>
                        isVisible(
                            row.Status
                        )
                )
                .sort(
                    (a, b) =>
                        Number(
                            a[
                                "Release Order"
                            ]
                        ) -
                        Number(
                            b[
                                "Release Order"
                            ]
                        )
                );

        container.innerHTML =
            singles.length

            ? singles
                .map(
                    (
                        item,
                        index
                    ) => {
                        const artist =
                            roleplayArtist(
                                item
                            );

                        const cover =
                            item[
                                "Cover URL or Path"
                            ];

                        const lyrics =
                            getLyrics(
                                item
                            );

                        const comingSoon =
                            isComingSoon(
                                item.Status
                            );

                        return `
                            <article class="single-card">

                                <div class="single-cover-placeholder">

                                    ${
                                        cover

                                        ? `
                                            <img
                                                src="${safe(
                                                    cover
                                                )}"
                                                alt="${safe(
                                                    item[
                                                        "Song Title"
                                                    ]
                                                )}"
                                                loading="lazy"
                                                onerror="
                                                    this.style.display='none'
                                                "
                                            >
                                        `

                                        : String(
                                            index + 1
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }

                                </div>


                                <div class="single-copy">

                                    <h3>
                                        ${safe(
                                            item[
                                                "Song Title"
                                            ]
                                        )}
                                    </h3>


                                    <p>
                                        ${safe(
                                            artist
                                        )}
                                    </p>


                                    <small>
                                        Original song by
                                        ${safe(
                                            item[
                                                "Original Credit"
                                            ]
                                        )}
                                    </small>

                                </div>


                                <button
                                    class="
                                        single-listen
                                        track-play
                                        js-track-play
                                    "
                                    type="button"

                                    data-title="${safe(
                                        item[
                                            "Song Title"
                                        ]
                                    )}"

                                    data-roleplay="${safe(
                                        artist
                                    )}"

                                    data-original="${safe(
                                        item[
                                            "Original Credit"
                                        ]
                                    )}"

                                    data-video="${safe(
                                        item[
                                            "YouTube Video ID"
                                        ]
                                    )}"

                                    data-cover="${safe(
                                        cover
                                    )}"

                                    data-lyrics="${safe(
                                        encodeLyrics(
                                            lyrics
                                        )
                                    )}"

                                    ${
                                        comingSoon
                                            ? "disabled"
                                            : ""
                                    }
                                >
                                    ${
                                        comingSoon
                                            ? "Coming Soon"
                                            : "▶ Listen"
                                    }
                                </button>

                            </article>
                        `;
                    }
                )
                .join("")

            : `
                <p class="loading-text">
                    No singles published yet.
                </p>
            `;
    }

    catch (error) {
        console.error(
            "SINGLES ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Singles could not be loaded.
            </p>
        `;
    }
}


/* =========================================================
   MUSIC PLAYER + 5 LYRIC OPTIONS
========================================================= */

const musicModal =
    $("#musicPlayerModal");

const youtubePlayer =
    $("#youtubePlayer");


function ensureLyricSelector() {

    if ($("#lyricSelector")) {
        return;
    }

    const saveButton =
        $("#saveLyricCard");

    if (!saveButton) {
        console.warn(
            "Save Lyric Card button not found."
        );
        return;
    }

    const selector =
        document.createElement("div");

    selector.id = "lyricSelector";
    selector.className = "lyric-selector";

    selector.innerHTML = `
        <p class="lyric-selector-title">
            Choose Your Lyric ♡
        </p>

        <div
            id="lyricOptions"
            class="lyric-options"
        ></div>
    `;

    const buttonWrapper =
        saveButton.parentElement;

    if (!buttonWrapper) {
        return;
    }

    buttonWrapper.parentElement.insertBefore(
        selector,
        buttonWrapper
    );
}


function renderLyricOptions(lyrics) {
    ensureLyricSelector();

    const container =
        $("#lyricOptions");

    const preview =
        $("#lyricQuote");

    if (!container) {
        return;
    }

    if (!lyrics.length) {
        container.innerHTML = `
            <p class="lyric-empty">
                Lyric options coming soon ♡
            </p>
        `;

        if (preview) {
            preview.textContent =
                "Choose your favorite lyric.";
        }

        return;
    }

    container.innerHTML =
        lyrics
            .slice(0, 5)
            .map(
                (
                    lyric,
                    index
                ) => `
                    <button
                        type="button"
                        class="
                            lyric-option
                            ${
                                index === 0
                                    ? "active"
                                    : ""
                            }
                        "
                        data-lyric="${safe(
                            lyric
                        )}"
                    >
                        <span class="lyric-option-number">
                            ${String(
                                index + 1
                            ).padStart(
                                2,
                                "0"
                            )}
                        </span>

                        <span class="lyric-option-text">
                            ${safe(
                                lyric
                            )}
                        </span>
                    </button>
                `
            )
            .join("");

    if (preview) {
        preview.textContent =
            lyrics[0];
    }
}


document.addEventListener(
    "click",
    event => {
        const option =
            event.target.closest(
                ".lyric-option"
            );

        if (!option) {
            return;
        }

        $$(".lyric-option")
            .forEach(
                button =>
                    button.classList.remove(
                        "active"
                    )
            );

        option.classList.add(
            "active"
        );

        if ($("#lyricQuote")) {
            $("#lyricQuote")
                .textContent =
                option.dataset.lyric ||
                "";
        }
    }
);


function openMusicPlayer(button) {
    const title =
        button.dataset.title ||
        "Song Title";

    const artist =
        button.dataset.roleplay ||
        "Jeniffer Nora";

    const original =
        button.dataset.original ||
        "";

    const video =
        button.dataset.video ||
        "";

    const cover =
        button.dataset.cover ||
        "";

    const lyrics =
        decodeLyrics(
            button.dataset.lyrics
        );

    if ($("#playerSongTitle")) {
        $("#playerSongTitle")
            .textContent =
            title;
    }

    if ($("#playerRoleplayArtist")) {
        $("#playerRoleplayArtist")
            .textContent =
            artist;
    }

    if ($("#playerOriginalCredit")) {
        $("#playerOriginalCredit")
            .textContent =
            "Original song by " +
            original;
    }

    if ($("#lyricBackground")) {
        $("#lyricBackground")
            .style
            .backgroundImage =
            cover
                ? `url("${cover}")`
                : "none";
    }

    renderLyricOptions(
        lyrics
    );

    if (video) {
        if ($("#youtubePlayerContainer")) {
            $("#youtubePlayerContainer")
                .style
                .display =
                "block";
        }

        if (youtubePlayer) {
            youtubePlayer.src =
                "https://www.youtube-nocookie.com/embed/" +
                encodeURIComponent(
                    video
                ) +
                "?autoplay=1&rel=0";
        }

        if ($("#openYouTubeButton")) {
            $("#openYouTubeButton")
                .style
                .display =
                "inline-block";

            $("#openYouTubeButton")
                .href =
                "https://www.youtube.com/watch?v=" +
                encodeURIComponent(
                    video
                );
        }
    }

    else {
        if ($("#youtubePlayerContainer")) {
            $("#youtubePlayerContainer")
                .style
                .display =
                "none";
        }

        if (youtubePlayer) {
            youtubePlayer.src =
                "";
        }

        if ($("#openYouTubeButton")) {
            $("#openYouTubeButton")
                .style
                .display =
                "none";
        }
    }

    musicModal?.classList.add(
        "active"
    );

    document.body.classList.add(
        "menu-open"
    );
}


function closeMusicPlayer() {
    musicModal?.classList.remove(
        "active"
    );

    if (youtubePlayer) {
        youtubePlayer.src =
            "";
    }

    document.body.classList.remove(
        "menu-open"
    );
}


document.addEventListener(
    "click",
    event => {
        const button =
            event.target.closest(
                ".js-track-play"
            );

        if (
            !button ||
            button.disabled
        ) {
            return;
        }

        openMusicPlayer(
            button
        );
    }
);


$("#closeMusicPlayer")
    ?.addEventListener(
        "click",
        closeMusicPlayer
    );


$("#musicModalBackground")
    ?.addEventListener(
        "click",
        closeMusicPlayer
    );


/* =========================================================
   VIDEOS
========================================================= */

async function loadVideos() {
    const container =
        $("#videoList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.videos
            );

        const videos =
            rows
                .filter(
                    row =>
                        isVisible(
                            row.Status
                        )
                )
                .sort(
                    (a, b) =>
                        Number(
                            a[
                                "Video Order"
                            ]
                        ) -
                        Number(
                            b[
                                "Video Order"
                            ]
                        )
                );

        container.innerHTML =
            videos.length

            ? videos
                .map(
                    item => {
                        const video =
                            item[
                                "YouTube Video ID"
                            ];

                        const thumbnail =
                            item[
                                "Thumbnail URL or Path"
                            ];

                        return `
                            <article class="video-card">

                                ${
                                    thumbnail

                                    ? `
                                        <img
                                            src="${safe(
                                                thumbnail
                                            )}"
                                            alt="${safe(
                                                item[
                                                    "Video Title"
                                                ]
                                            )}"
                                            loading="lazy"
                                        >
                                    `

                                    : ""
                                }


                                <h3>
                                    ${safe(
                                        item[
                                            "Video Title"
                                        ]
                                    )}
                                </h3>


                                <p>
                                    ${safe(
                                        item[
                                            "Roleplay Artist"
                                        ]
                                    )}
                                </p>


                                <small>
                                    Original credit:
                                    ${safe(
                                        item[
                                            "Original Credit"
                                        ]
                                    )}
                                </small>


                                ${
                                    video

                                    ? `
                                        <a
                                            href="https://www.youtube.com/watch?v=${safe(
                                                video
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Watch Video
                                        </a>
                                    `

                                    : ""
                                }

                            </article>
                        `;
                    }
                )
                .join("")

            : `
                <p class="loading-text">
                    No videos published yet.
                </p>
            `;
    }

    catch (error) {
        console.error(
            "VIDEO ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Videos could not be loaded.
            </p>
        `;
    }
}


/* =========================================================
   TOUR
========================================================= */

async function loadTour() {
    const container =
        $("#tourList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.tour
            );

        const tour =
            rows
                .filter(
                    row =>
                        isVisible(
                            row.Status
                        )
                )
                .sort(
                    (a, b) =>
                        Number(
                            a[
                                "Tour Order"
                            ]
                        ) -
                        Number(
                            b[
                                "Tour Order"
                            ]
                        )
                );

        container.innerHTML =
            tour.length

            ? tour
                .map(
                    item => {
                        const link =
                            item[
                                "Ticket URL"
                            ];

                        const buttonText =
                            item[
                                "Ticket Text"
                            ] ||
                            "Coming Soon";

                        return `
                            <article class="tour-item">

                                <p class="tour-date">
                                    ${safe(
                                        item.Date
                                    )}
                                </p>


                                <div class="tour-location">

                                    <h3>
                                        ${safe(
                                            item.City
                                        )}
                                    </h3>


                                    <p>
                                        ${safe(
                                            item[
                                                "Event Name"
                                            ] ||
                                            item.Venue
                                        )}
                                    </p>

                                </div>


                                ${
                                    link

                                    ? `
                                        <a
                                            class="tour-status"
                                            href="${safe(
                                                link
                                            )}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            ${safe(
                                                buttonText
                                            )}
                                        </a>
                                    `

                                    : `
                                        <span class="tour-status">
                                            ${safe(
                                                buttonText
                                            )}
                                        </span>
                                    `
                                }

                            </article>
                        `;
                    }
                )
                .join("")

            : `
                <p class="loading-text">
                    No tour dates published.
                </p>
            `;
    }

    catch (error) {
        console.error(
            "TOUR ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Tour could not be loaded.
            </p>
        `;
    }
}


/* =========================================================
   SHOP
========================================================= */

let shopProducts = [];
let currentShopCategory =
    "all";

async function loadShop() {
    const container =
        $("#shopProductList");

    try {
        const rows =
            await fetchSheet(
                SHEETS.shop
            );

        shopProducts =
            rows
                .filter(
                    row =>
                        isVisible(
                            row.Status
                        )
                )
                .sort(
                    (a, b) =>
                        Number(
                            a[
                                "Product Order"
                            ]
                        ) -
                        Number(
                            b[
                                "Product Order"
                            ]
                        )
                );

        renderShop();
        renderCart();
    }

    catch (error) {
        console.error(
            "SHOP ERROR:",
            error
        );

        container.innerHTML = `
            <p class="loading-text">
                Shop could not be loaded.
            </p>
        `;
    }
}

function renderShop() {
    const container =
        $("#shopProductList");

    const products =
        shopProducts.filter(
            product => {
                if (
                    currentShopCategory ===
                    "all"
                ) {
                    return true;
                }

                return (
                    String(
                        product.Category
                    )
                        .trim()
                        .toLowerCase() ===
                    currentShopCategory
                );
            }
        );

    container.innerHTML =
        products.length

        ? products
            .map(
                product => {
                    const stock =
                        Number(
                            product.Stock
                        ) || 0;

                    const comingSoon =
                        isComingSoon(
                            product.Status
                        );

                    const soldOut =
                        isSoldOut(
                            product.Status
                        ) ||
                        stock <= 0;

                    const image =
                        product[
                            "Image URL or Path"
                        ];

                    return `
                        <article class="shop-card">

                            <div class="shop-image">

                                ${
                                    image

                                    ? `
                                        <img
                                            src="${safe(
                                                image
                                            )}"
                                            alt="${safe(
                                                product[
                                                    "Product Name"
                                                ]
                                            )}"
                                            loading="lazy"
                                        >
                                    `

                                    : safe(
                                        product.Category
                                    )
                                }

                            </div>


                            <h3>
                                ${safe(
                                    product[
                                        "Product Name"
                                    ]
                                )}
                            </h3>


                            <p>
                                ${safe(
                                    product.Description
                                )}
                            </p>


                            <p class="shop-price">
                                ${formatMoney(
                                    product.Price,
                                    product.Currency
                                )}
                            </p>


                            <p class="shop-stock">
                                ${
                                    comingSoon
                                        ? "Coming Soon"
                                        : soldOut
                                            ? "Sold Out"
                                            : `${stock} available`
                                }
                            </p>


                            <button
                                class="add-to-cart-button"
                                type="button"

                                data-product-id="${safe(
                                    product[
                                        "Product ID"
                                    ]
                                )}"

                                ${
                                    soldOut ||
                                    comingSoon
                                        ? "disabled"
                                        : ""
                                }
                            >
                                ${
                                    comingSoon
                                        ? "Coming Soon"
                                        : soldOut
                                            ? "Sold Out"
                                            : "Add to Bag"
                                }
                            </button>

                        </article>
                    `;
                }
            )
            .join("")

        : `
            <p class="loading-text">
                No products in this category.
            </p>
        `;
}


/* =========================================================
   SHOP TABS
========================================================= */

$$(".shop-tab")
    .forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    currentShopCategory =
                        button.dataset
                            .category;

                    $$(".shop-tab")
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );

                    button.classList.add(
                        "active"
                    );

                    renderShop();
                }
            );
        }
    );


/* =========================================================
   CART
========================================================= */

let cart =
    JSON.parse(
        localStorage.getItem(
            "jenifferNoraCart"
        ) || "[]"
    );

function saveCart() {
    localStorage.setItem(
        "jenifferNoraCart",
        JSON.stringify(
            cart
        )
    );

    renderCart();
}

function cartTotal() {
    let total = 0;

    cart.forEach(
        item => {
            const product =
                shopProducts.find(
                    product =>
                        String(
                            product[
                                "Product ID"
                            ]
                        ) ===
                        String(
                            item.id
                        )
                );

            if (!product) {
                return;
            }

            total +=
                (
                    Number(
                        product.Price
                    ) || 0
                ) *
                item.quantity;
        }
    );

    return total;
}

function addToCart(
    productId
) {
    const product =
        shopProducts.find(
            product =>
                String(
                    product[
                        "Product ID"
                    ]
                ) ===
                String(
                    productId
                )
        );

    if (
        !product ||
        isComingSoon(
            product.Status
        ) ||
        isSoldOut(
            product.Status
        )
    ) {
        return;
    }

    const maxStock =
        Number(
            product.Stock
        ) || 0;

    if (
        maxStock <= 0
    ) {
        return;
    }

    const existing =
        cart.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    productId
                )
        );

    if (existing) {
        existing.quantity =
            Math.min(
                existing.quantity + 1,
                maxStock
            );
    }

    else {
        cart.push(
            {
                id:
                    String(
                        productId
                    ),

                quantity: 1
            }
        );
    }

    saveCart();
    openCart();
}

function renderCart() {
    const container =
        $("#cartItems");

    if (!container) {
        return;
    }

    cart =
        cart.filter(
            item =>
                shopProducts.some(
                    product =>
                        String(
                            product[
                                "Product ID"
                            ]
                        ) ===
                        String(
                            item.id
                        )
                )
        );

    const count =
        cart.reduce(
            (
                total,
                item
            ) =>
                total +
                item.quantity,
            0
        );

    if (
        $("#cartCount")
    ) {
        $("#cartCount")
            .textContent =
            count;
    }

    if (!cart.length) {
        container.innerHTML = `
            <p class="empty-cart-message">
                Your bag is empty.
            </p>
        `;
    }

    else {
        container.innerHTML =
            cart
                .map(
                    item => {
                        const product =
                            shopProducts.find(
                                product =>
                                    String(
                                        product[
                                            "Product ID"
                                        ]
                                    ) ===
                                    String(
                                        item.id
                                    )
                            );

                        return `
                            <div class="cart-item">

                                <div>

                                    <strong>
                                        ${safe(
                                            product[
                                                "Product Name"
                                            ]
                                        )}
                                    </strong>


                                    <small>
                                        ${formatMoney(
                                            product.Price,
                                            product.Currency
                                        )}
                                    </small>

                                </div>


                                <div class="cart-quantity">

                                    <button
                                        type="button"
                                        data-cart-minus="${safe(
                                            item.id
                                        )}"
                                    >
                                        −
                                    </button>


                                    <span>
                                        ${item.quantity}
                                    </span>


                                    <button
                                        type="button"
                                        data-cart-plus="${safe(
                                            item.id
                                        )}"
                                    >
                                        +
                                    </button>

                                </div>


                                <button
                                    type="button"
                                    data-cart-remove="${safe(
                                        item.id
                                    )}"
                                >
                                    ×
                                </button>

                            </div>
                        `;
                    }
                )
                .join("");
    }

    const total =
        cartTotal();

    if (
        $("#cartSubtotal")
    ) {
        $("#cartSubtotal")
            .textContent =
            formatMoney(total);
    }

    if (
        $("#cartTotal")
    ) {
        $("#cartTotal")
            .textContent =
            formatMoney(total);
    }

    if (
        $("#checkoutTotal")
    ) {
        $("#checkoutTotal")
            .textContent =
            formatMoney(total);
    }
}


/* =========================================================
   GLOBAL CART EVENTS
========================================================= */

document.addEventListener(
    "click",
    event => {
        const addButton =
            event.target.closest(
                ".add-to-cart-button"
            );

        if (addButton) {
            addToCart(
                addButton.dataset
                    .productId
            );

            return;
        }

        const plus =
            event.target.dataset
                ?.cartPlus;

        const minus =
            event.target.dataset
                ?.cartMinus;

        const remove =
            event.target.dataset
                ?.cartRemove;

        if (plus) {
            const item =
                cart.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            plus
                        )
                );

            const product =
                shopProducts.find(
                    product =>
                        String(
                            product[
                                "Product ID"
                            ]
                        ) ===
                        String(
                            plus
                        )
                );

            if (
                item &&
                product
            ) {
                item.quantity =
                    Math.min(
                        item.quantity + 1,
                        Number(
                            product.Stock
                        ) || 1
                    );

                saveCart();
            }
        }

        if (minus) {
            const item =
                cart.find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            minus
                        )
                );

            if (item) {
                item.quantity--;

                if (
                    item.quantity <= 0
                ) {
                    cart =
                        cart.filter(
                            cartItem =>
                                String(
                                    cartItem.id
                                ) !==
                                String(
                                    minus
                                )
                        );
                }

                saveCart();
            }
        }

        if (remove) {
            cart =
                cart.filter(
                    item =>
                        String(
                            item.id
                        ) !==
                        String(
                            remove
                        )
                );

            saveCart();
        }
    }
);


/* =========================================================
   CART DRAWER
========================================================= */

function openCart() {
    $("#cartDrawer")
        ?.classList.add(
            "active"
        );

    document.body.classList.add(
        "menu-open"
    );
}

function closeCart() {
    $("#cartDrawer")
        ?.classList.remove(
            "active"
        );

    document.body.classList.remove(
        "menu-open"
    );
}

$("#openCartButton")
    ?.addEventListener(
        "click",
        openCart
    );

$("#closeCartButton")
    ?.addEventListener(
        "click",
        closeCart
    );

$("#cartBackground")
    ?.addEventListener(
        "click",
        closeCart
    );


/* =========================================================
   CHECKOUT
========================================================= */

function openCheckout() {
    if (!cart.length) {
        alert(
            "Your bag is empty ♡"
        );

        return;
    }

    closeCart();

    $("#checkoutTotal")
        .textContent =
        formatMoney(
            cartTotal()
        );

    $("#checkoutModal")
        ?.classList.add(
            "active"
        );

    document.body.classList.add(
        "menu-open"
    );
}

function closeCheckout() {
    $("#checkoutModal")
        ?.classList.remove(
            "active"
        );

    document.body.classList.remove(
        "menu-open"
    );
}

$("#checkoutButton")
    ?.addEventListener(
        "click",
        openCheckout
    );

$("#closeCheckoutButton")
    ?.addEventListener(
        "click",
        closeCheckout
    );

$("#checkoutBackground")
    ?.addEventListener(
        "click",
        closeCheckout
    );


/* =========================================================
   FICTIONAL PAYMENT
========================================================= */

$("#fictionalCheckoutForm")
    ?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            const payment =
                document.querySelector(
                    'input[name="paymentMethod"]:checked'
                );

            const order =
                "JN-" +
                Date.now()
                    .toString()
                    .slice(-8);

            $("#orderNumber")
                .textContent =
                order;

            $("#successPaymentMethod")
                .textContent =
                payment?.value ||
                "Fictional Payment";

            closeCheckout();

            $("#successModal")
                ?.classList.add(
                    "active"
                );

            document.body.classList.add(
                "menu-open"
            );

            cart = [];

            saveCart();
        }
    );

$("#closeSuccessButton")
    ?.addEventListener(
        "click",
        () => {
            $("#successModal")
                ?.classList.remove(
                    "active"
                );

            document.body.classList.remove(
                "menu-open"
            );
        }
    );


/* =========================================================
   SIGN UP
========================================================= */

$("#signupForm")
    ?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            $("#formMessage")
                .textContent =
                "Welcome to the Jeadore list ♡";

            event.target.reset();
        }
    );


/* =========================================================
   CURRENT YEAR
========================================================= */

if (
    $("#currentYear")
) {
    $("#currentYear")
        .textContent =
        new Date()
            .getFullYear();
}


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
    "keydown",
    event => {
        if (
            event.key ===
            "Escape"
        ) {
            closeMenu();
            closeCart();
            closeCheckout();
            closeMusicPlayer();
        }
    }
);


/* =========================================================
   SAVE LYRIC CARD
========================================================= */

function loadCanvasImage(source) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const image =
                new Image();

            image.onload =
                () =>
                    resolve(
                        image
                    );

            image.onerror =
                () =>
                    reject(
                        new Error(
                            "Lyric card background image could not be loaded."
                        )
                    );

            if (
                /^https?:\/\//i.test(
                    source
                ) &&
                !source.startsWith(
                    window.location.origin
                )
            ) {
                image.crossOrigin =
                    "anonymous";
            }

            image.src =
                source;
        }
    );
}


function drawWrappedText(
    context,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    maxLines = 5
) {
    const words =
        String(text || "")
            .trim()
            .split(/\s+/);

    const lines = [];

    let line = "";

    for (
        const word of words
    ) {
        const testLine =
            line
                ? `${line} ${word}`
                : word;

        if (
            context
                .measureText(
                    testLine
                )
                .width >
                maxWidth &&
            line
        ) {
            lines.push(
                line
            );

            line =
                word;

            if (
                lines.length >=
                maxLines - 1
            ) {
                break;
            }
        }

        else {
            line =
                testLine;
        }
    }

    if (
        line &&
        lines.length <
            maxLines
    ) {
        lines.push(
            line
        );
    }

    lines.forEach(
        (
            lineText,
            index
        ) => {
            context.fillText(
                lineText,
                x,
                y +
                    index *
                    lineHeight
            );
        }
    );

    return (
        y +
        lines.length *
            lineHeight
    );
}


function getLyricCardCover() {
    const background =
        $("#lyricBackground");

    if (!background) {
        return "";
    }

    const backgroundStyle =
        background.style
            .backgroundImage ||
        "";

    const match =
        backgroundStyle.match(
            /url\(["']?(.*?)["']?\)/
        );

    return match
        ? match[1]
        : "";
}


function downloadCanvas(
    canvas,
    filename
) {
    canvas.toBlob(
        blob => {
            if (!blob) {
                alert(
                    "Lyric card could not be generated."
                );

                return;
            }

            const objectURL =
                URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                objectURL;

            link.download =
                filename;

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            setTimeout(
                () =>
                    URL.revokeObjectURL(
                        objectURL
                    ),
                1000
            );
        },
        "image/png"
    );
}


async function saveCurrentLyricCard() {
    const button =
        $("#saveLyricCard");

    if (button) {
        button.disabled =
            true;

        button.textContent =
            "Saving...";
    }

    try {
        const title =
            $("#playerSongTitle")
                ?.textContent
                ?.trim() ||
            "Jeniffer Nora";

        const artist =
            $("#playerRoleplayArtist")
                ?.textContent
                ?.trim() ||
            "Jeniffer Nora";

        const original =
            $("#playerOriginalCredit")
                ?.textContent
                ?.trim() ||
            "";

        const lyric =
            $("#lyricQuote")
                ?.textContent
                ?.trim() ||
            "Choose your favorite lyric.";

        const cover =
            getLyricCardCover();

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            1080;

        canvas.height =
            1350;

        const context =
            canvas.getContext(
                "2d"
            );

        if (!context) {
            throw new Error(
                "Canvas is not supported by this browser."
            );
        }

        context.fillStyle =
            "#5A0717";

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        if (cover) {
            try {
                const image =
                    await loadCanvasImage(
                        cover
                    );

                const scale =
                    Math.max(
                        canvas.width /
                            image.width,

                        canvas.height /
                            image.height
                    );

                const width =
                    image.width *
                    scale;

                const height =
                    image.height *
                    scale;

                const x =
                    (
                        canvas.width -
                        width
                    ) / 2;

                const y =
                    (
                        canvas.height -
                        height
                    ) / 2;

                context.filter =
                    "grayscale(100%)";

                context.drawImage(
                    image,
                    x,
                    y,
                    width,
                    height
                );

                context.filter =
                    "none";
            }

            catch (error) {
                console.warn(
                    "Lyric card cover fallback:",
                    error
                );
            }
        }


        const gradient =
            context.createLinearGradient(
                0,
                0,
                0,
                canvas.height
            );

        gradient.addColorStop(
            0,
            "rgba(27,23,23,0.18)"
        );

        gradient.addColorStop(
            0.50,
            "rgba(90,7,23,0.58)"
        );

        gradient.addColorStop(
            1,
            "rgba(27,23,23,0.97)"
        );

        context.fillStyle =
            gradient;

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        context.textBaseline =
            "top";

        context.fillStyle =
            "#FAF2E7";

        context.font =
            "22px Arial";

        context.fillText(
            "NOW PLAYING",
            80,
            75
        );


        context.font =
            "66px Georgia";

        const lyricEnd =
            drawWrappedText(
                context,
                lyric,
                80,
                270,
                900,
                80,
                5
            );


        const infoY =
            Math.max(
                870,
                lyricEnd +
                100
            );


        context.fillStyle =
            "rgba(250,242,231,0.72)";

        context.font =
            "19px Arial";

        context.fillText(
            "JENIFFER NORA’S UNIVERSE",
            80,
            infoY
        );


        context.fillStyle =
            "#FAF2E7";

        context.font =
            "68px Georgia";

        drawWrappedText(
            context,
            title,
            80,
            infoY + 48,
            900,
            72,
            2
        );


        context.font =
            "25px Arial";

        context.fillText(
            artist.toUpperCase(),
            80,
            infoY + 205
        );


        context.strokeStyle =
            "rgba(250,242,231,0.35)";

        context.beginPath();

        context.moveTo(
            80,
            infoY + 260
        );

        context.lineTo(
            1000,
            infoY + 260
        );

        context.stroke();


        context.font =
            "21px Arial";

        context.fillText(
            original,
            80,
            infoY + 292
        );


        context.fillStyle =
            "rgba(250,242,231,0.65)";

        context.font =
            "16px Arial";

        context.fillText(
            "FICTIONAL ARTIST · FOR ROLEPLAY PURPOSES ONLY",
            80,
            infoY + 340
        );


        const safeName =
            title
                .toLowerCase()
                .normalize(
                    "NFKD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                )
                .replace(
                    /^-+|-+$/g,
                    ""
                ) ||
            "jeniffer-nora";


        downloadCanvas(
            canvas,
            `${safeName}-jeniffer-nora.png`
        );
    }

    catch (error) {
        console.error(
            "SAVE LYRIC CARD ERROR:",
            error
        );

        alert(
            "Lyric card could not be saved. Check Console for the error."
        );
    }

    finally {
        if (button) {
            button.disabled =
                false;

            button.textContent =
                "Save Lyric Card";
        }
    }
}


/* =========================================================
   SAVE BUTTON EVENT
========================================================= */

document.addEventListener(
    "click",
    event => {
        const saveButton =
            event.target.closest(
                "#saveLyricCard"
            );

        if (!saveButton) {
            return;
        }

        event.preventDefault();

        saveCurrentLyricCard();
    }
);


/* =========================================================
   START WEBSITE
========================================================= */

async function initialiseWebsite() {
    console.log(
        "Jeniffer Nora CMS starting..."
    );

    const jobs = [
        [
            "Settings",
            loadSettings
        ],

        [
            "Albums",
            loadAlbums
        ],

        [
            "Korean Albums",
            loadKoreanAlbums
        ],

        [
            "Singles",
            loadSingles
        ],

        [
            "Videos",
            loadVideos
        ],

        [
            "Tour",
            loadTour
        ],

        [
            "Shop",
            loadShop
        ]
    ];

    for (
        const [
            name,
            loader
        ]
        of jobs
    ) {
        try {
            await loader();

            console.log(
                "✓ Loaded:",
                name
            );
        }

        catch (error) {
            console.error(
                "✗ Failed:",
                name,
                error
            );
        }
    }

    renderCart();

    console.log(
        "Jeniffer Nora CMS finished."
    );
}

initialiseWebsite();
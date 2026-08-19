"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");


/* =========================================================
   CONFIG
========================================================= */

const BASE_URL =
    "https://jeniffernora.github.io/vinyl-from-jen";

const SHARE_ROOT =
    path.join(
        __dirname,
        "share"
    );


const SHEETS = {

    albums:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxtXpCT9-SV_V0qATfxnHWrVGzGxaKqpE2wC0sDokvtxF7BYtGylaV2yVEdkyKKTUDEiSllaZNrN-u/pub?gid=1317380980&single=true&output=csv",

    koreanAlbums:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxtXpCT9-SV_V0qATfxnHWrVGzGxaKqpE2wC0sDokvtxF7BYtGylaV2yVEdkyKKTUDEiSllaZNrN-u/pub?gid=1583281469&single=true&output=csv",

    singles:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxtXpCT9-SV_V0qATfxnHWrVGzGxaKqpE2wC0sDokvtxF7BYtGylaV2yVEdkyKKTUDEiSllaZNrN-u/pub?gid=1064742388&single=true&output=csv"

};


/* =========================================================
   HELPERS
========================================================= */

function slugify(value) {

    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
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
        );

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function absoluteImageURL(value) {

    const image =
        String(value || "")
            .trim();

    if (!image) {

        return (
            BASE_URL +
            "/assets/images/jeniffer.jpg"
        );

    }


    if (
        image.startsWith(
            "http://"
        ) ||
        image.startsWith(
            "https://"
        )
    ) {

        return image;

    }


    return (
        BASE_URL +
        "/" +
        image.replace(
            /^\/+/,
            ""
        )
    );

}


function published(status) {

    return (
        String(status || "")
            .trim()
            .toLowerCase() ===
        "published"
    );

}


/* =========================================================
   CSV PARSER
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

                const item = {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        if (!header) {

                            return;

                        }


                        item[header] =
                            String(
                                row[index] ?? ""
                            ).trim();

                    }
                );


                return item;

            }
        );

}


/* =========================================================
   FETCH CSV
========================================================= */

function fetchText(url) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            https
                .get(
                    url,
                    response => {

                        if (
                            response.statusCode >= 300 &&
                            response.statusCode < 400 &&
                            response.headers.location
                        ) {

                            return resolve(
                                fetchText(
                                    response.headers.location
                                )
                            );

                        }


                        if (
                            response.statusCode !== 200
                        ) {

                            reject(
                                new Error(
                                    `HTTP ${response.statusCode}`
                                )
                            );

                            return;

                        }


                        let data = "";


                        response.setEncoding(
                            "utf8"
                        );


                        response.on(
                            "data",
                            chunk => {

                                data += chunk;

                            }
                        );


                        response.on(
                            "end",
                            () => {

                                resolve(data);

                            }
                        );

                    }
                )
                .on(
                    "error",
                    reject
                );

        }
    );

}


/* =========================================================
   ROLEPLAY ARTIST
========================================================= */

function roleplayArtist(row) {

    const artist =
        row[
            "Roleplay Artist"
        ] ||
        "Jeniffer Nora";


    const featured =
        row[
            "Featured Artist"
        ] ||
        "";


    if (!featured) {

        return artist;

    }


    if (
        featured
            .toLowerCase()
            .includes("remake")
    ) {

        return artist;

    }


    return (
        artist +
        " feat. " +
        featured
    );

}


/* =========================================================
   SHARE PAGE HTML
========================================================= */

function buildShareHTML(row) {

    const title =
        row[
            "Song Title"
        ] ||
        "Jeniffer Nora";


    const artist =
        roleplayArtist(row);


    const original =
        row[
            "Original Credit"
        ] ||
        "";


    const slug =
        slugify(title);


    const shareURL =
        `${BASE_URL}/share/${slug}/`;


    const destinationURL =
        `${BASE_URL}/?song=${encodeURIComponent(
            title
        )}#music`;


    const imageURL =
        absoluteImageURL(
            row[
                "Cover URL or Path"
            ]
        );


    const description =
        original
            ? `Jeniffer Nora · Original song by ${original}`
            : "Jeniffer Nora · Vinyl From Jen";


    return `<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>${escapeHTML(
        title
    )} | Vinyl From Jen</title>


    <!-- OPEN GRAPH -->

    <meta
        property="og:type"
        content="music.song"
    >

    <meta
        property="og:site_name"
        content="Vinyl From Jen"
    >

    <meta
        property="og:title"
        content="${escapeHTML(
            title
        )} — ${escapeHTML(
            artist
        )}"
    >

    <meta
        property="og:description"
        content="${escapeHTML(
            description
        )}"
    >

    <meta
        property="og:url"
        content="${escapeHTML(
            shareURL
        )}"
    >

    <meta
        property="og:image"
        content="${escapeHTML(
            imageURL
        )}"
    >


    <!-- X / TWITTER -->

    <meta
        name="twitter:card"
        content="summary"
    >

    <meta
        name="twitter:title"
        content="${escapeHTML(
            title
        )} — ${escapeHTML(
            artist
        )}"
    >

    <meta
        name="twitter:description"
        content="${escapeHTML(
            description
        )}"
    >

    <meta
        name="twitter:image"
        content="${escapeHTML(
            imageURL
        )}"
    >


    <!-- REDIRECT TO WEBSITE -->

    <meta
        http-equiv="refresh"
        content="0; url=${escapeHTML(
            destinationURL
        )}"
    >

    <link
        rel="canonical"
        href="${escapeHTML(
            destinationURL
        )}"
    >

</head>


<body>

    <p>
        Opening
        <a href="${escapeHTML(
            destinationURL
        )}">
            ${escapeHTML(
                title
            )}
        </a>
        on Vinyl From Jen...
    </p>

</body>

</html>`;
}


/* =========================================================
   CREATE SHARE PAGE
========================================================= */

function createSharePage(row) {

    const title =
        row[
            "Song Title"
        ];


    if (!title) {

        return;

    }


    const slug =
        slugify(title);


    if (!slug) {

        return;

    }


    const folder =
        path.join(
            SHARE_ROOT,
            slug
        );


    fs.mkdirSync(
        folder,
        {
            recursive: true
        }
    );


    const html =
        buildShareHTML(row);


    fs.writeFileSync(
        path.join(
            folder,
            "index.html"
        ),
        html,
        "utf8"
    );


    console.log(
        "✓",
        title,
        "→",
        `share/${slug}/`
    );

}


/* =========================================================
   GENERATE ALL SONG SHARE PAGES
========================================================= */

async function generate() {

    console.log(
        "Generating Vinyl From Jen share pages..."
    );


    fs.mkdirSync(
        SHARE_ROOT,
        {
            recursive: true
        }
    );


    const allSongs = [];


    for (
        const [
            name,
            url
        ]
        of Object.entries(
            SHEETS
        )
    ) {

        console.log(
            "Loading:",
            name
        );


        const csv =
            await fetchText(
                url
            );


        const rows =
            parseCSV(csv);


        const visibleRows =
            rows.filter(
                row =>
                    published(
                        row.Status
                    ) &&
                    row[
                        "Song Title"
                    ]
            );


        allSongs.push(
            ...visibleRows
        );


        console.log(
            `Loaded ${visibleRows.length} songs from ${name}.`
        );

    }


    const uniqueSongs =
        new Map();


    allSongs.forEach(
        row => {

            const slug =
                slugify(
                    row[
                        "Song Title"
                    ]
                );


            if (
                slug &&
                !uniqueSongs.has(
                    slug
                )
            ) {

                uniqueSongs.set(
                    slug,
                    row
                );

            }

        }
    );


    for (
        const row
        of uniqueSongs.values()
    ) {

        createSharePage(
            row
        );

    }


    console.log("");
    console.log(
        `DONE — generated ${uniqueSongs.size} share pages.`
    );

}


generate()
    .catch(
        error => {

            console.error(
                "SHARE GENERATOR ERROR:",
                error
            );


            process.exitCode =
                1;

        }
    );
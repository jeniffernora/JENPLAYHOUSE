"use strict";

const fs =
    require(
        "fs"
    );

const path =
    require(
        "path"
    );

const https =
    require(
        "https"
    );


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


function slugify(
    value
) {

    return String(
        value || ""
    )
        .trim()
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
        );

}


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
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


function absoluteImageURL(
    value
) {

    const image =
        String(
            value || ""
        ).trim();


    if (
        !image
    ) {

        return (
            BASE_URL +
            "/assets/images/jeniffer.jpg"
        );

    }


    if (
        /^https?:\/\//i
            .test(
                image
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


function parseCSV(
    csvText
) {

    const rows =
        [];

    let row =
        [];

    let cell =
        "";

    let insideQuotes =
        false;


    for (
        let i = 0;
        i <
        csvText.length;
        i++
    ) {

        const char =
            csvText[i];

        const next =
            csvText[
                i + 1
            ];


        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            cell += '"';

            i++;

        }

        else if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }

        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                cell
            );

            cell =
                "";

        }

        else if (
            (
                char ===
                "\n" ||
                char ===
                "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char ===
                "\r" &&
                next ===
                "\n"
            ) {

                i++;

            }


            row.push(
                cell
            );

            cell =
                "";


            if (
                row.some(
                    value =>
                        String(
                            value
                        ).trim() !==
                        ""
                )
            ) {

                rows.push(
                    row
                );

            }


            row =
                [];

        }

        else {

            cell +=
                char;

        }

    }


    if (
        cell !== "" ||
        row.length
    ) {

        row.push(
            cell
        );

        rows.push(
            row
        );

    }


    const headers =
        rows[0].map(
            item =>
                String(
                    item
                )
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

                const result =
                    {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        result[
                            header
                        ] =
                            String(
                                row[
                                    index
                                ] ??
                                ""
                            ).trim();

                    }
                );


                return result;

            }
        );

}


function fetchText(
    url
) {

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
                            response.statusCode >=
                            300 &&
                            response.statusCode <
                            400 &&
                            response.headers
                                .location
                        ) {

                            fetchText(
                                response
                                    .headers
                                    .location
                            )
                                .then(
                                    resolve
                                )
                                .catch(
                                    reject
                                );


                            return;

                        }


                        let data =
                            "";


                        response.on(
                            "data",
                            chunk => {

                                data +=
                                    chunk;

                            }
                        );


                        response.on(
                            "end",
                            () => {

                                resolve(
                                    data
                                );

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


function roleplayArtist(
    row
) {

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


    if (
        !featured
    ) {

        return artist;

    }


    return (
        artist +
        " feat. " +
        featured
    );

}


function buildShareHTML(
    row
) {

    const title =
        row[
            "Song Title"
        ] ||
        "Jeniffer Nora";


    const artist =
        roleplayArtist(
            row
        );


    const original =
        row[
            "Original Credit"
        ] ||
        "";


    const slug =
        slugify(
            title
        );


    const shareURL =
        `${BASE_URL}/share/${slug}/`;


    const destination =
        `${BASE_URL}/?song=${encodeURIComponent(
            title
        )}#music`;


    /*
    SHARE thumbnail memakai Lyric Background Image jika tersedia,
    lalu fallback ke cover.
    */

    const image =
        absoluteImageURL(
            row[
                "Lyric Background Image"
            ] ||
            row[
                "Cover URL or Path"
            ]
        );


    const description =
        original

        ? `Jeniffer Nora · Original song by ${original}`

        : "Jeniffer Nora · Vinyl From Jen";


    return `
<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        ${escapeHTML(
            title
        )} | Vinyl From Jen
    </title>


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
            image
        )}"
    >


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
            image
        )}"
    >


    <meta
        http-equiv="refresh"
        content="0; url=${escapeHTML(
            destination
        )}"
    >

</head>


<body>

    <p>
        Opening ${escapeHTML(
            title
        )} on Vinyl From Jen...
    </p>

</body>

</html>
`;

}


function createSharePage(
    row
) {

    const title =
        row[
            "Song Title"
        ];


    if (
        !title
    ) {

        return;

    }


    const slug =
        slugify(
            title
        );


    const folder =
        path.join(
            SHARE_ROOT,
            slug
        );


    fs.mkdirSync(
        folder,
        {
            recursive:
                true
        }
    );


    fs.writeFileSync(
        path.join(
            folder,
            "index.html"
        ),
        buildShareHTML(
            row
        ),
        "utf8"
    );


    console.log(
        "✓",
        title,
        "→",
        `share/${slug}/`
    );

}


async function generate() {

    console.log(
        "Generating Vinyl From Jen share pages..."
    );


    fs.mkdirSync(
        SHARE_ROOT,
        {
            recursive:
                true
        }
    );


    const songs =
        [];


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
            parseCSV(
                csv
            );


        const visible =
            rows.filter(
                row => {

                    const status =
                        String(
                            row.Status ||
                            ""
                        )
                            .trim()
                            .toLowerCase();


                    return (
                        row[
                            "Song Title"
                        ] &&
                        ![
                            "draft",
                            "hidden",
                            "archived"
                        ].includes(
                            status
                        )
                    );

                }
            );


        songs.push(
            ...visible
        );


        console.log(
            `Loaded ${visible.length} songs from ${name}.`
        );

    }


    const unique =
        new Map();


    songs.forEach(
        row => {

            const slug =
                slugify(
                    row[
                        "Song Title"
                    ]
                );


            if (
                slug &&
                !unique.has(
                    slug
                )
            ) {

                unique.set(
                    slug,
                    row
                );

            }

        }
    );


    for (
        const row
        of unique.values()
    ) {

        createSharePage(
            row
        );

    }


    console.log(
        ""
    );


    console.log(
        `DONE — generated ${unique.size} share pages.`
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
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import DevtoolsPlugin from 'puppeteer-extra-plugin-devtools'

puppeteer.use(StealthPlugin())
puppeteer.use(DevtoolsPlugin());

export default async function scrapeLinks({ url, searchQuery, headers }) {
    return new Promise(async (res, rej) => {
        try {
            console.log(`[!] Openning Browser`)
            const browser = await puppeteer.launch({
                headless: "new"
            });

            console.log(`[!] Opening tab`)
            const _page_ = await browser.newPage();

            // if (headers) {
            //     await _page_.setExtraHTTPHeaders(headers)
            // }

            await _page_.setRequestInterception(true);

            _page_.on("request", req => req.continue())
            let timeout = setTimeout(async () => {
                try {
                    console.log(`[!] Closing...`)
                    await browser.close()
                    
                    rej()
                } catch (err) { }
            }, 30000);
            _page_.on("response", async (d) => {
                const url = d.url()

                if (!url?.toLowerCase()?.includes(searchQuery.toLowerCase())) return

                try {
                    const data = await d.json()

                    clearTimeout(timeout)

                    try {
                        // console.log(`[!] Closing...`)
                        await browser.close()
                    } catch (err) { }

                    res({
                        data,
                        url
                    })

                } catch (err) { }
            })

            console.log(`[!] Going to ${url}`)
            await _page_.goto(url);

            if (headers) {
                const cookies = headers?.Cookie?.split(';').map(pair => {
                    const parts = pair.split('=');
                    return {
                        name: parts[0].trim(),
                        value: decodeURIComponent(parts[1]),
                    };
                });

                await _page_.setCookie(...cookies)
            }

            console.log(`[!] Reloading and listening`)
            await _page_.reload()
        } catch (err) {
            console.error(err)
            rej()
        }
    })
}
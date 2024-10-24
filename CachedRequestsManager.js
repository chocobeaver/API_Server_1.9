import * as utilities from "./utilities.js";
import * as serverVariables from "./serverVariables.js";

let repositoryCachesExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

// Repository file data models cache
global.RequestedCaches = [];
global.cachedRepositoriesCleanerStarted = false;

export default class CachedRequestsManager {
    static add(url, data,ETag) {
        if (!cachedRepositoriesCleanerStarted) {
            cachedRepositoriesCleanerStarted = true;
            CachedRequestsManager.startCachedRepositoriesCleaner();
        }
        if (url != "") {
            CachedRequestsManager.clear(url);
            RequestedCaches.push({
                url,
                data,
                ETag,
                Expire_Time: utilities.nowInSeconds() + repositoryCachesExpirationTime
            });
            console.log(BgWhite + FgBlue, `[Data of ${url} repository has been cached]`);
        }
    }
    static startCachedRepositoriesCleaner() {
        // periodic cleaning of expired cached repository data
        setInterval(CachedRequestsManager.flushExpired, repositoryCachesExpirationTime * 1000);
        console.log(BgWhite + FgBlue, "[Periodic repositories data caches cleaning process started...]");

    }
    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of RequestedCaches) {
                if (cache.url == url) indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(RequestedCaches, indexToDelete);
        }
    }
    static find(url) {
        try {
            if (url != "") {
                for (let cache of RequestedCaches) {
                    if (cache.url == url) {
                        cache.Expire_Time = utilities.nowInSeconds() + repositoryCachesExpirationTime;
                        console.log(BgWhite + FgBlue, `[${cache.url} data retrieved from cache]`);
                        return cache.data;
                    }
                }
            }
        } catch (error) {
            console.log(BgWhite + FgRed, "[repository cache error!]", error);
        }
        return null;
    }
    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of RequestedCaches) {
            if (cache.Expire_Time <= now) {
                console.log(BgWhite + FgBlue, "Cached file data of " + cache.url + ".json expired");
            }
        }
        RequestedCaches = RequestedCaches.filter( cache => cache.Expire_Time > now);
    }

    static get(HttpContext) {
        let url = HttpContext.req.url;
        let cachedEntry = CachedRequestsManager.find(url);

        if (cachedEntry) {
            if(cachedEntry.ETag==HttpContext.req.headers["etag"]){
                HttpContext.response.JSON(cachedEntry.content, cachedEntry.ETag, true);
                return true;
            }
        }
        return false;
    }
}

    

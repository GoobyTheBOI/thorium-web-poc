"use client";

import { useEffect, useState } from "react";
import { HttpFetcher, Link } from "@readium/shared";
import { useAppSelector } from "@edrlab/thorium-web/epub";
import { MyCustomReader } from "./MyCustomReader";
import { ThPreferencesProvider } from "@edrlab/thorium-web/epub";

export default function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [isClient, setIsClient] = useState(false);
  const [params, setParams] = useState<{ [key: string]: string | string[] | undefined } | null>(null);
  const [error, setError] = useState("");
  const [manifest, setManifest] = useState<object | undefined>(undefined);
  const [selfLink, setSelfLink] = useState<string | undefined>(undefined);

  useAppSelector(state => state.reader.isLoading);

  useEffect(() => {
    setIsClient(true);
    searchParams.then((params) => setParams(params));
  }, [searchParams]);


  useEffect(() => {
    if (params && isClient) {
      let book = "moby-dick";
      let publicationURL = "";
      if (params["book"]) {
        book = Array.isArray(params["book"]) ? params["book"][0] : params["book"];
      }

      if (book.startsWith("http://") || book.startsWith("https://")) {
        // TODO: use URL.canParse()
        // Make sure streamer gets Base64Url
        const bookUrl = new URL(book);
        const bookPathnameArray = bookUrl.pathname.split("/");
        const sanitizedBookPathnameArray = bookPathnameArray.map((entry) => {
          if (entry && entry !== "manifest.json") {
            return entry.replace(/\+|%2B/g, "-").replace(/\/|%2F/g, "_").replace(/=|%3D/g, "");
          } else {
            return entry;
          }
        });
        const sanitizedBook = new URL(sanitizedBookPathnameArray.join("/"), bookUrl.origin);
        publicationURL = sanitizedBook.href;

        if (!publicationURL.endsWith("manifest.json") && !publicationURL.endsWith("/"))
          publicationURL += "/";
      } else {
        throw new Error("book parameter is required");
      }

      const manifestLink = new Link({ href: "manifest.json" });
      const fetcher = new HttpFetcher(undefined, publicationURL);
      const fetched = fetcher.get(manifestLink);
      fetched.link().then((link) => {
        setSelfLink(link.toURL(publicationURL));
      });

      fetched.readAsJSON().then((manifestData) => {
        setManifest(manifestData as object);
      }).catch((error) => {
        console.error("Error loading manifest:", error);
        setError(`Failed loading manifest ${publicationURL}: ${error.message}`);
      });
    }
  }, [params, isClient]);


  return (
    <>
        <ThPreferencesProvider>
          <h1>Thorium Web Reader</h1>
            {isClient && manifest && selfLink &&
              <MyCustomReader rawManifest={manifest} selfHref={selfLink} />
            }
            {error && <div className="error">{error}</div>}
        </ThPreferencesProvider>
    </>

  );
}

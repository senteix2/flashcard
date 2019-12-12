package com.senteix2.flashcard.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.io.IOException;

public class HtmlImporter {

    public static String getPage(String url) throws IOException {
        Document doc = null ;
        doc = Jsoup.connect(url).ignoreContentType(true).get();
        return doc.body().html();
    }

}

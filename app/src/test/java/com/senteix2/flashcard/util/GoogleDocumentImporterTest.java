package com.senteix2.flashcard.util;


import org.jsoup.internal.StringUtil;
import org.junit.Before;
import org.junit.Test;
import static  org.junit.Assert.* ;

public class GoogleDocumentImporterTest {


    private GoogleDocumentImporter googleDocumentImporter;

    @Before
    public void setUp() throws Exception {
        googleDocumentImporter = new GoogleDocumentImporter() ;
    }

    @Test
    public void importAndStore_successTest() {
        String result = "url";// googleDocumentImporter.importAndToJsonString("url");
        assertTrue(!StringUtil.isBlank(result));
    }

    @Test
    public void importAndStore_noparametersTest() {
        String result = googleDocumentImporter.importAndToJsonString( null);
        assertTrue(StringUtil.isBlank(result));
    }
}
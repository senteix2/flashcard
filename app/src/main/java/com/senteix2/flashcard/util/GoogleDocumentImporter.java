package com.senteix2.flashcard.util;

import org.jsoup.Jsoup;
import org.jsoup.internal.StringUtil;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import com.fasterxml.jackson.databind.ObjectMapper;

public class GoogleDocumentImporter {
    private static final String TAG= GoogleDocumentImporter.class.getName() ;
    private static final String SHEET_STRING = "/spreadsheets/" ;
    private static final String DOCUMENT_STRING = "/document/" ;

    private ObjectMapper jsonMapper ;

    public GoogleDocumentImporter(){
        jsonMapper = new ObjectMapper();
    }


    public DocumentType determinePageType(String url){
        DocumentType type = DocumentType.NONE ;
        if(StringUtil.isBlank(url)){
            type  = DocumentType.NONE ;
        }else if(url.contains(SHEET_STRING)){
            type  = DocumentType.SHEET ;
        }else if(url.contains(DOCUMENT_STRING)){
            type  = DocumentType.HTML ;
        }

        return type ;
    }


    public Map<String, Map<String, List<String>>>  getRemoteDocument(String url, Boolean generateOrgFile) throws IOException {
        Map<String, Map<String, List<String>>> result  = null;
        final Map<String ,String> ankidata = new HashMap<>();
        DocumentType type = determinePageType(url);

        Document doc = null ;
        doc = Jsoup.connect(url).get();

        result =  extractDataFromDocument(doc, type , ankidata , generateOrgFile ) ;
        return result ;
    }

    public Map<String, Map<String, List<String>>> extractDataFromDocument(Document doc , DocumentType type, Map<String,String> ankidata, Boolean generateOrgFile){

        Map<String, Map<String, List<String>>> sheets =  new HashMap<>();
        List<String> sheetsName = new ArrayList<>();

        final String orgStar = "*";
        final String imageTemplate  = " [image=%s] " ;

        Element header = doc.selectFirst("div#doc-title") ;
        String deckName = header.children().get(0).text()  ;
        Element sheetsSoup=  doc.selectFirst("ul#sheet-menu");

        for(Element sheet : sheetsSoup.children()){
            if("li".equals(sheet.tagName())&&sheet.children().size()>0){
                String key = sheet.children().get(0).text();
                sheets.put(key, new HashMap<String, List<String>>());
                sheetsName.add(key);
            }
        }

        Elements contents =  doc.select("table.waffle") ;

        Elements cssData = doc.select("style");
        Map<String,List<String>> cssStyles = new HashMap<>();

        for(Element css :  cssData){
            Element cssFirstData = doc.selectFirst("style") ;
            Map<String,List<String>>  styleSelection = getCssStyles(cssFirstData) ;
            cssStyles.putAll(styleSelection) ;
        }

        String orgFormattedFile = "" ;

        for(int i = 0;  i<contents.size(); i++){
            Element table = contents.get(i);
            String tableName = sheetsName.get(i);
            for(Element tbody : table.children()){
                if("tbody".equals(tbody.tagName())){
                    boolean isHeader = true ;
                    List<String> fields = new ArrayList<>();
                    int  t=0;
                    for(Element row : tbody.children()){
                        int j = 0 ;
                        for(Element item : row.children()){
                            if("td".equals(item.tagName())&& isHeader){
                                fields.add(item.text());
                                sheets.get(tableName).put(item.text(), new ArrayList<String>());
                            } else if("td".equals(item.tagName())&&!isHeader){
                                sheets.get(tableName).get(fields.get(j)).add(item.html()) ;
                                j++;

                                if(generateOrgFile) {
                                    String lineText = item.text();
                                    if (lineText.length() > 0) {
                                        orgFormattedFile += lineText;
                                    }
                                }

                                int indentation = j ;
                                List<String> itemText = new ArrayList<>() ;
                                Elements textSpans = doc.select("span");
                                String lineOfText = "" ;

                                for(Element span : textSpans){
                                    lineOfText += extractSpanWithStyles(span, cssStyles) ;
                                }

                                Elements images = doc.select("img");
                                if(images.size()>=1){
                                    String src = images.get(0).attr("src");
                                    String imageText = String.format(imageTemplate, src) ;
                                    lineOfText += imageText;
                                    itemText.add(lineOfText) ;
                                }

                                indentation++;
                                String orgStars = new String(new char[indentation]).replace("\0", orgStar);

                                if(generateOrgFile){
                                    for(String line : itemText){
                                        String formattedListItem = String.format("%s %s",orgStars,line);
                                        orgFormattedFile += formattedListItem ;
                                    }
                                }

                            }
                        }
                        isHeader = false  ;
                        //Log.d(TAG,"t:"+t+" j:"+j+" isHeader:"+isHeader);
                        t++;
                    }
                }
            }

        }

        if(ankidata==null){
            ankidata =  new HashMap<>();
        }

        ankidata.put("deckName", deckName ) ;
        ankidata.put("data", orgFormattedFile) ;

        return sheets ;
    }


    public String extractSpanWithStyles(Element span,  Map<String,List<String>> cssStyles ){
        String text = span.text() ;
        String claszz = span.attr("class") ;
        List<String> relevantStyles = new ArrayList<>();

        if(StringUtil.isBlank(claszz)){
            return text ;
        }else if(cssStyles.containsKey(claszz)){
            for(String style : cssStyles.get(claszz)){
                relevantStyles.add(style);
            }
        }

        if(relevantStyles.size()>0) {
            String styleAttributes = "";
            for(String i : relevantStyles){
                styleAttributes+= i+";";
            }
            String styledText = "<span style="+styleAttributes+">"+text+"</span>" ;
            return styledText ;
        }else{
            return text ;
        }
    }

    public  Map<String,List<String>>  getCssStyles (Element cssFirstData ){

        final String cSectionRegexPattern = "\\.s\\d{1,2}\\{[^\\}]+\\}" ;
        String csDataContent = cssFirstData.html() ;

        List<String> cssSections  = getAllMatches(cSectionRegexPattern, csDataContent) ;

        Map<String,List<String>>  cssStyles = new HashMap<>();
        final String regexValuePattern =  ":[^;^\\}\\s]+[;\\}]" ; //":[^;^}\\s]+[;}]" ;
        final String startSectionRegex = "[;\\{]"; //"[;{]" ;
        final String nameRegex = "s[\\d]+" ;

        for(String section :cssSections){
            String name = getFirstMatch(nameRegex,section);
            List<String> color = getAllMatches(startSectionRegex+ "color"+ regexValuePattern, section) ;
            List<String> fontStyle = getAllMatches(startSectionRegex+ "font-style"+ regexValuePattern, section);
            List<String> fontWeight = getAllMatches(startSectionRegex+ "font-weight"+ regexValuePattern, section);
            List<String> textDecoration = getAllMatches(startSectionRegex+ "text-decoration"+ regexValuePattern, section);

            if(color.size()>0&& color.get(0).contains("color:#000000")){
                color = new ArrayList<>() ;
            }
            if(fontWeight.size()>0&& color.get(0).contains("font-weight:400")){
                fontWeight = new ArrayList<>() ;
            }
            if(fontStyle.size()>0&& color.get(0).contains("font-style:normal")){
                fontStyle = new ArrayList<>() ;
            }
            if(textDecoration.size()>0&& color.get(0).contains("text-decoration:none")){
                textDecoration  = new ArrayList<>() ;
            }

            List [] d = {color, fontStyle , fontWeight, textDecoration} ;
            List styleValues =  new ArrayList() ;

            for(List<String> i : d){
                if(i.size()>0){
                    String cleanedStyle = i.get(0).substring(1,i.get(0).length()-1);
                    styleValues.add(cleanedStyle);

                }

            }
            cssStyles.put(name, styleValues) ;

        }

        return cssStyles ;
    }

    public String getFirstMatch(String StringPattern, String target){
        Pattern pattern = Pattern.compile(StringPattern);
        String result = "" ;
        Matcher matcher =  pattern.matcher(target) ;
        if(matcher.find()){
            result =  matcher.group() ;
        }
        return result ;
    }

    public List<String> getAllMatches(String StringPattern, String target){
        List<String> results = new ArrayList<>();
        Pattern pattern = Pattern.compile(StringPattern);
        Matcher matcher =  pattern.matcher(target) ;
        if(matcher.find()){
            results.add(matcher.group());
        }
        return results ;
    }

    public String importAndToJsonString(String url, Boolean generateOrgFile) throws Exception{
        String result = "";
        // do stuff
        Map<String, Map<String, List<String>>> backup;


        if (StringUtil.isBlank(url)) {
            return result;
        } else {
            url = verifyAndCorrectGoogleUrl(url) ;
            backup = getRemoteDocument(url,generateOrgFile);
        }

        result = jsonMapper.writeValueAsString(backup);
        Log.d(TAG, "result:" + result.length());

        return result;
    }

    public String verifyAndCorrectGoogleUrl(String url) throws  Exception{
            if(StringUtil.isBlank(url)){
                throw new Exception("url can not be blank");
            }
            if(!url.contains("pubhtml")){
                Integer from  = url.lastIndexOf("/") +1;
                url = url.substring(0,from) + "pubhtml" ;
            }
            return url ;
    }


}




enum DocumentType { NONE, HTML,  SHEET}
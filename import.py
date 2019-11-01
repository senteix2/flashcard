import requests
import sys
import json
import codecs
from bs4 import BeautifulSoup
import re
from libs.org_to_anki.org_parser.parseData import buildNamedDeck

def getRemoteDeck(url):
    # Get remote page
    # TODO Validate url before getting data
    pageType = _determinePageType(url)
    deck = None
    if pageType == "html":
        data = _download(url)
        orgData = _parseHtmlPageToAnkiDeck(data)
        deck = orgData["deck"]

    elif pageType == "sheet":
        data = _download(url)
        orgData = _parseHtmlPageToAnkiDeck(data)
        deck = orgData["deck"]
    else:
        raise Exception("url is not a Google doc or sheet file")

    return orgData

def _determinePageType(url):

    # TODO use url to determine page types
    sheetString = "/spreadsheets/"
    documentString = "/document/"
    if (documentString in url):
        return "html"
    elif (sheetString in url):
        return "sheet"
    else:
        return None

def _parseHtmlPageToAnkiDeck(data):

    orgData = _generateOrgListFromHtmlPage(data)
    deckName = orgData["deckName"]
    data = orgData["data"]
    # TODO update org_to_anki to have function for this
    orgData["deck"] = buildNamedDeck(data, deckName)

    return orgData

def _generateOrgListFromHtmlPage(data):

    orgStar = "*"
    imageTemplate = " [image={}]"
    soup = BeautifulSoup(data, 'html.parser')
    header = soup.find("div", {"id":"doc-title"})
    ## just to check
    #print(soup.prettify())
    deckName = list(header.children)[0].text
    sheetsSoup = soup.find("ul", {"id":"sheet-menu"})
    sheets = {}
    sheetsName=[]
    for sheet in sheetsSoup.children:
        #print(sheet)
        if sheet.name == "li" and len(list(sheet.children))>0 :
            key = list(sheet.children)[0].text
            sheets[key]={}
            sheetsName.append(key)
    contents = soup.find_all("table", {"class":"waffle"})

    ## Try and get CSS
    """ """
    cssData = soup.find_all("style")
    cssStyles = {}
    for css in cssData:
        cssData = soup.find_all("style")[0]
        styleSection = _getCssStyles(cssData)
        cssStyles.update(styleSection)
    """ """

    orgFormattedFile = []

    for table, tableName in zip(contents , sheetsName) :
        for tbody in table.children:
            if tbody.name == "tbody":
                header = True
                fields = []
                for row in tbody.children:
                    j = 0
                    for item in row.children:
                        # print(item)
                        if item.name == "td" and header ==True:
                            fields.append(item.text)
                            sheets[tableName][item.text]=[]
                        elif item.name == "td" and header ==False:
                            # print("p")
                            sheets[tableName][fields[j]].append(item.text)
                            j += 1
                            lineText = item.text
                            if len(lineText) > 0:
                                orgFormattedFile.append(lineText)

                            # Item class is in the format of s## where # is a number
                            indentation = j
                            itemText = []

                            textSpans = item.find_all("span")
                            lineOfText = ""
                            for span in textSpans:
                                lineOfText += _extractSpanWithStyles(span, cssStyles)
                                # Check for images and take first
                            images = item.find_all("img")
                            if len(images) >= 1:
                                imageText = imageTemplate.format(images[0]["src"])
                                lineOfText += imageText
                                itemText.append(lineOfText)

                            indentation += 1
                            orgStars = (orgStar * indentation)
                            for line in itemText:
                                formattedListItem = "{} {}".format(orgStars, line)
                                orgFormattedFile.append(formattedListItem)

                        else:
                            pass
                            # print("Unknown line type: {}".format(item.name))
                    header=False

    return {"deckName":deckName, "data":orgFormattedFile, "sheets": sheets}


def _getCssStyles(cssData):

    # Google docs used the following class for lists $c1
    cSectionRegexPattern = "\.s\d{1,2}\{[^\}]+}"
    cssSections = re.findall(cSectionRegexPattern, cssData.text)

    cssStyles = {}
    # for each c section extract critical data
    regexValuePattern = ":[^;^}\s]+[;}]"
    startSectionRegex = "[;{]"
    for section in cssSections:
        name = re.findall("s[\d]+", section)[0]
        color = re.findall("{}{}{}".format(startSectionRegex, "color", regexValuePattern), section)
        fontStyle = re.findall("{}{}{}".format(startSectionRegex, "font-style", regexValuePattern), section)
        fontWeight = re.findall("{}{}{}".format(startSectionRegex, "font-weight", regexValuePattern), section)
        textDecoration = re.findall("{}{}{}".format(startSectionRegex, "text-decoration", regexValuePattern), section)

        # Ignore default values
        if (len(color) >0 and "color:#000000" in color[0]):
            color = []
        if (len(fontWeight) >0 and "font-weight:400" in fontWeight[0]):
            fontWeight = []
        if (len(fontStyle) >0 and "font-style:normal" in fontStyle[0]):
            fontStyle = []
        if (len(textDecoration) >0 and "text-decoration:none" in textDecoration[0]):
            textDecoration = []

        d = [color, fontStyle, fontWeight, textDecoration]

        styleValues = []
        for i in d:
            if len(i) > 0:
                cleanedStyle = i[0][1:-1]
                styleValues.append(cleanedStyle)
        cssStyles[name] = styleValues

    return cssStyles

def _extractSpanWithStyles(soupSpan, cssStyles):

    text = soupSpan.text
    classes = soupSpan.attrs.get("class")

    if classes == None:
        return text

    relevantStyles = []
    for clazz in classes:
        if cssStyles.get(clazz) != None:
            for style in cssStyles.get(clazz):
                relevantStyles.append(style)


    if len(relevantStyles) > 0:
        styleAttributes = ""
        for i in relevantStyles:
            styleAttributes += i + ";"
        styledText = '<span style="{}">{}</span>'.format(styleAttributes, text)
        return styledText
    else:
        return text


def _download(url):

    response = requests.get(url)
    if response.status_code == 200:
        data = response.content
    else:
        raise Exception("Failed to get url: {}".format(response.status_code))

    data = data.decode("utf-8")
    data = data.replace("\xa0","")
    return data

if __name__ == "__main__":
    print("Import data from google sheets: ")
    url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZWJSPs6LkXbLjoBCAudjmiZoQgbupLGKUYkELIdt1pNuczvFMvyBRCf84G3DaiquPbE04DIHESyAu/pubhtml";
    if len(sys.argv)>1 :
        print("using url from command line ", sys.argv[1])
        url = sys.argv[1]

    orgData = getRemoteDeck(url)
    print(orgData["sheets"])
    result = {"backup" : orgData["sheets"] }
    with open("backup.js", "w") as write_file:
        write_file.write("backup=")
        json.dump(orgData["sheets"], write_file)
    print("import completed")
    pass

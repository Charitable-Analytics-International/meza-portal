
def isNone(el):
    return el is None


def isString(el):
    return not isNone(el) and type(el) == str


def isInteger(el):
    return not isNone(el) and type(el) == int


def isFloat(el):
    return not isNone(el) and type(el) == float


def isDict(el):
    return not isNone(el) and type(el) == dict


def isList(el):
    return not isNone(el) and type(el) == list


def isNumber(el):
    if isInteger(el) or isFloat(el): return True
    try:
        _el = int(el)
        return True
    except:
        pass
    return False


def isPositiveInteger(el):
    return isInteger(el) and el > 0


def isStringNonEmpty(el):
    return isString(el) and len(el) > 0


def isListNonEmpty(el):
    return isList(el) and len(el) > 0


def cleanStr(el):
    if not isString(str): return None
    return el.strip().lower()


def isStrInList(el, _list):
    if not isString(el): return False
    if not isListNonEmpty(_list): return False
    return el in _list
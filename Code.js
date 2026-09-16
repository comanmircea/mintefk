function master_setup() {
  setup_terapeut();
  setupOnFormSubmit();
  setup_preluarebeneficiari();
}

/**
 * Instaleaza trigger-ul onFormSubmit pentru formularul curent.
 *
 * Input:
 * - foloseste formId, functionName si reinstallIfExisting hardcodate pentru setup rapid
 *
 * retVal:
 * - nu returneaza nimic
 */
function setupOnFormSubmit() {
  try {
    const formId = CFG.FORMS.FORM_ID;
    const functionName = "onFormSubmit";
    const reinstallIfExisting = true;

    const retSetup = LibGW.installOnFormSubmitTrigger(formId, functionName, reinstallIfExisting);
    if (retSetup.retCode != LibRetCodeType.Succes)
      LibGW.Log(LibLogType.Log, "installOnFormSubmitTrigger: " + JSON.stringify(retSetup));
  }
  catch (err) {
    LibGW.Log(LibLogType.Error, "setupOnFormSubmit: " + err.stack);
  }
  finally {
  }
}

/**
 * Handler generic pentru trigger-ul real de onFormSubmit.
 *
 * Input:
 * - e = event-ul primit de la Google Form
 */
function onFormSubmit(e) {
  let retVal = null;
  let retMsg = "";

  try {
    // Validare event minim
    if (!e || !e.response) {
      retMsg = "event lipsa sau invalid";
      LibGW.Log(LibLogType.Error, "onFormSubmit: " + retMsg);
      return;
    }

    // Extragem map-ul raspunsurilor folosind functia din LIB
    const retResponsesMap = LibGW.buildResponsesMap(e.response);
    if (!retResponsesMap) {
      retMsg = "LibGW.buildResponsesMap failed";
      LibGW.Log(LibLogType.Error, "onFormSubmit: " + retMsg);
      return;
    }

    // Aici continua logica specifica proiectului nou
    const retProcesare = procesareRaspunsuriForm(retResponsesMap, e.response.getRespondentEmail(), e.response.getTimestamp());
    if (retProcesare.retCode === LibRetCodeType.Eroare) {
      retMsg = "procesareRaspunsuriForm failed: " + retProcesare.retMsg;
      LibGW.Log(LibLogType.Error, "onFormSubmit: " + retMsg);
      return;
    }

    retVal =
    {
      responsesMap: retResponsesMap,
      processResult: retProcesare.retVal
    };

    if (retProcesare.retCode === LibRetCodeType.Warning) {
      retMsg = retProcesare.retMsg;
      LibGW.Log(LibLogType.Warning, "onFormSubmit: finalizat cu warning: " + retMsg);
      return;
    }

    LibGW.Log(LibLogType.Log, "onFormSubmit: submit procesat cu succes");
  }
  catch (err) {
    retMsg = "exceptie la handler-ul onFormSubmit";
    LibGW.Log(LibLogType.Error, "onFormSubmit: " + err.stack);
  }
  finally {
  }
}

/**
 * Hook generic pentru logica specifica proiectului nou.
 *
 * Input:
 * - raspunsuriForm = map titlu intrebare -> raspuns
 *
 * retVal:
 * - {
 *     responsesCount: number
 *   }
 */
function procesareRaspunsuriForm(raspunsuriForm, email, timestamp) {
  let retVal = null;
  let retMsg = "";
  let protectionRez = null;
  const lockOpts =
  {
    waitMs: 5000,
    maxWaitMs: 30000,
    description: "TEMP_LOCK_BENEFICIARI"
  };

  try {
    // Validare input
    if (!raspunsuriForm || typeof raspunsuriForm !== "object" || Array.isArray(raspunsuriForm)) {
      retMsg = "raspunsuriForm lipsa sau invalid";
      LibGW.Log(LibGW.LibLogType.Error, "procesareRaspunsuriForm: " + retMsg);
      return { retCode: LibGW.LibRetCodeType.Eroare, retVal, retMsg };
    }

    if (Object.keys(raspunsuriForm).length === 0) {
      retMsg = "raspunsuriForm gol";
      LibGW.Log(LibGW.LibLogType.Warning, "procesareRaspunsuriForm: " + retMsg);
      return { retCode: LibGW.LibRetCodeType.Warning, retVal, retMsg };
    }

    // Afisam toate raspunsurile primite, cate unul pe rand nou
    Object.keys(raspunsuriForm).forEach(function (key) {
      LibGW.Log(LibGW.LibLogType.Log, "procesareRaspunsuriForm: " + key + " = " + JSON.stringify(raspunsuriForm[key]));
    });

    let telefon = String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.NUMAR_DE_TELEFON] || "").trim();
    if (!telefon) {
      retMsg = "telefon lipsa in raspunsurile formularului";
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }
    telefon = LibGW.normalizePhone(telefon, "40");

    // Deschidere Master
    const retOpen = LibGW.openSpreadsheetByFileId(CFG.SHEETS.MASTER.ID);
    if (!retOpen || retOpen.retCode !== LibRetCodeType.Succes || !retOpen.retVal) {
      retMsg = "LibGW.openSpreadsheetByFileId failed: " + (retOpen ? retOpen.retMsg : "");
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const spreadsheet = retOpen.retVal;

    // Deschidere sheet Beneficiari
    var retGetSheet = LibGW.getSheetByNameFromSpreadsheet(spreadsheet, CFG.SHEETS.MASTER.BENEFICIARI.NAME);
    if (!retGetSheet || retGetSheet.retCode !== LibRetCodeType.Succes || !retGetSheet.retVal) {
      retMsg = "LibGW.getSheetByNameFromSpreadsheet failed: " + (retGetSheet ? retGetSheet.retMsg : "");
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const shBeneficiari = retGetSheet.retVal;

    // Citire map header -> coloana
    var retGetHdrKeyToColMap = LibGW.getHeaderKeyToColMap(shBeneficiari);
    if (!retGetHdrKeyToColMap || typeof retGetHdrKeyToColMap !== "object") {
      retMsg = "LibGW.getHeaderKeyToColMap a returnat rezultat invalid";
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const beneficiarHdrMap = retGetHdrKeyToColMap.retVal;

    const telefonCol = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.TELEFON];
    if (!telefonCol || !Number.isInteger(telefonCol) || telefonCol < 1) {
      retMsg = 'coloana "' + CFG.SHEETS.MASTER.BENEFICIARI.HDR.EMAIL + '" nu a fost gasita in header';
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    // Cautare TELEFON 
    const retFindTelefon = LibGW.findCellByText(
      shBeneficiari,
      telefon,
      1,
      shBeneficiari.getLastRow(),
      true
    );

    if (!retFindTelefon || retFindTelefon.retCode == LibRetCodeType.Eroare) {
      LibGW.Log(LibLogType.Error, retFindTelefon.retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    //DUPLICATE, email OVI
    if (retFindTelefon.retVal) {
      retMsg = "Beneficiarul (" + telefon + ") exista deja.";
      console.warn(retMsg);
      return { retCode: LibRetCodeType.Warning, retVal, retMsg };
    }

    //---------------------------------
    // COPIEZ FORM --> BENEFICIARI
    //---------------------------------
    // Lock sheet
    const retProtect = LibGW.protectSheetTemporarily(shBeneficiari, lockOpts);
    if (retProtect.retCode !== LibRetCodeType.Succes) {
      LibGW.Log(LibLogType.Error, "protectSheetTemporarily failed: " + retProtect.retMsg);
      if (retProtect.retCode === LibRetCodeType.Eroare) {
        return { retCode: retProtect.retCode, retVal: null, retMsg: retProtect.retMsg };
      }
    }
    protectionRez = retProtect.retVal;

    const beneficiarNewRow = shBeneficiari.getLastRow() + 1;

    const colID = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.ID];
    const colStatus = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.STATUS];
    const colTerapeut = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.TERAPEUT];
    const colEmail = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.EMAIL];
    const colNume = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.NUME];
    const colTelefon = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.TELEFON];
    const colVarsta = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.VARSTA];
    const colGenul = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.GENUL];
    const colTipSedinte = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.TIP_SEDINTE];
    const colInAfaraClujului = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.IN_AFARA_CLUJULUI];
    const colDescriereMotiv = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.DESCRIERE_MOTIV];
    const colIntervaleProgram = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.INTERVALE_PROGRAM];
    const colDonatie = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.DONATIE];
    const colDiagnostic = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.DIAGNOSTIC];
    const colDeUndeAtiAuzitDeNoi = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.DE_UNDE_ATI_AUZIT_DE_NOI];
    const colAlteInformatii = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.ALTE_INFORMATII];
    const colDataInscriere = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.DATA_INSCRIERE];

    shBeneficiari.getRange(beneficiarNewRow, colNume).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.NUMELE_SI_PRENUMELE] || "").trim()
    );

    shBeneficiari.getRange(beneficiarNewRow, colEmail).setValue(email);

    shBeneficiari.getRange(beneficiarNewRow, colTelefon).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.NUMAR_DE_TELEFON] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colVarsta).setValue(
      raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.VARSTA]
    );
    shBeneficiari.getRange(beneficiarNewRow, colGenul).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.GENUL] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colTipSedinte).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.TIP_SEDINTE] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colInAfaraClujului).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.IN_AFARA_ORASULUI] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colDescriereMotiv).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.DESCRIERE_MOTIV] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colIntervaleProgram).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.INTERVALE_LIBERE_PROGRAM] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colDonatie).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.DONATIE] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colDiagnostic).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.DIAGNOSTIC] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colDeUndeAtiAuzitDeNoi).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.DE_UNDE_ATI_AUZIT_DE_NOI] || "").trim()
    );
    shBeneficiari.getRange(beneficiarNewRow, colAlteInformatii).setValue(
      String(raspunsuriForm[CFG.FORMS.FORM_RESPONSES_HDR.ALTE_INFORMATII] || "").trim()
    );

    const timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss");
    shBeneficiari.getRange(beneficiarNewRow, colDataInscriere).setValue(timestampStr);

    //STYLE pe tot range-ul
    const range = shBeneficiari.getRange(beneficiarNewRow, 1, 1, shBeneficiari.getLastColumn());
    range
      .clearFormat()
      .setFontFamily("Arial")
      .setFontSize(12)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontWeight("normal");

    //ID
    shBeneficiari.getRange(beneficiarNewRow, colID).setValue("B_" + LibGW.getUniqueId());

    // Deschidere sheet CONFIG
    retGetSheet = LibGW.getSheetByNameFromSpreadsheet(spreadsheet, CFG.SHEETS.MASTER.CONFIG.NAME);
    if (!retGetSheet || retGetSheet.retCode !== LibRetCodeType.Succes || !retGetSheet.retVal) {
      retMsg = "LibGW.getSheetByNameFromSpreadsheet failed: " + (retGetSheet ? retGetSheet.retMsg : "");
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const shConfig = retGetSheet.retVal;
    retGetHdrKeyToColMap = LibGW.getHeaderKeyToColMap(shConfig);
    if (!retGetHdrKeyToColMap || typeof retGetHdrKeyToColMap !== "object") {
      retMsg = "LibGW.getHeaderKeyToColMap a returnat rezultat invalid";
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const configHdrMap = retGetHdrKeyToColMap.retVal;
    const colConfigStatus = configHdrMap[CFG.SHEETS.MASTER.CONFIG.HDR.STATUS_BENEFICIARI];
    const colConfigTerapeuti = configHdrMap[CFG.SHEETS.MASTER.CONFIG.HDR.DROPDOWN_TERAPEUTI];

    //STATUS
    const statusCell = shBeneficiari.getRange(beneficiarNewRow, colStatus);
    var retCopy = LibGW.copyStyleFromCell(
      shConfig,
      CFG.SHEETS.MASTER.CONFIG.DROPDOWN_STYLES_ROWS.STATUS_BENEFICIARI,
      colConfigStatus,
      shBeneficiari,
      beneficiarNewRow,
      colStatus);
    if (retCopy.retCode !== LibRetCodeType.Succes) {
      Log(LibLogType.Error, "testCopyStyleFromCell: copyStyleFromCell failed: " + retCopy.retMsg);
      return { retCode: LibGW.LibRetCodeType.Eroare, retVal: null, retMsg: retGetSheetFormular.retMsg };
    }
    statusCell.setValue(CFG.SHEETS.MASTER.BENEFICIARI.STATUS.NOU);

    //TERAPEUT
    const terapeutCell = shBeneficiari.getRange(beneficiarNewRow, colTerapeut);
    var retCopy = LibGW.copyStyleFromCell(
      shConfig,
      CFG.SHEETS.MASTER.CONFIG.DROPDOWN_STYLES_ROWS.DROPDOWN_TERAPEUTI,
      colConfigTerapeuti,
      shBeneficiari,
      beneficiarNewRow,
      colTerapeut);
    if (retCopy.retCode !== LibRetCodeType.Succes) {
      Log(LibLogType.Error, "testCopyStyleFromCell: copyStyleFromCell failed: " + retCopy.retMsg);
      return { retCode: LibGW.LibRetCodeType.Eroare, retVal: null, retMsg: retGetSheetFormular.retMsg };
    }
    terapeutCell.setValue("");

    SpreadsheetApp.flush();

    LibGW.Log(LibGW.LibLogType.Log, "procesareRaspunsuriForm: hook generic apelat cu succes");
    return { retCode: LibGW.LibRetCodeType.Succes, retVal, retMsg };
  }
  catch (err) {
    retMsg = "exceptie la procesarea raspunsurilor din formular";
    LibGW.Log(LibGW.LibLogType.Error, "procesareRaspunsuriForm: " + err.stack);
    return { retCode: LibGW.LibRetCodeType.Eroare, retVal, retMsg };
  }
  finally {
    if (protectionRez) {
      LibGW.unprotectSheetTemporarily(protectionRez, lockOpts);
    }
  }
}

/**
 * Test minimal pentru onFormSubmit.
 * Instaleaza trigger-ul real si ruleaza local handler-ul cu mock event hardcodat din LIB.
 *
 * Input:
 * - foloseste formId hardcodat si FORM_TEST_RESPONSES
 *
 * retVal:
 * - nu returneaza nimic
 */
function test_OnFormSubmit() {
  try {
    const FORM_TEST_RESPONSES =
    {
      [CFG.FORMS.FORM_RESPONSES_HDR.TIMESTAMP]: new Date("2026-04-12T14:02:31"),
      [CFG.FORMS.FORM_RESPONSES_HDR.EMAIL_ADDRESS]: "mcmirsoft@gmail.com",
      [CFG.FORMS.FORM_RESPONSES_HDR.SUNT_DE_ACORD]: "Sunt de acord",
      [CFG.FORMS.FORM_RESPONSES_HDR.NUMELE_SI_PRENUMELE]: "Beneficiar 1",
      [CFG.FORMS.FORM_RESPONSES_HDR.VARSTA]: 42,
      [CFG.FORMS.FORM_RESPONSES_HDR.GENUL]: "Masculin",
      [CFG.FORMS.FORM_RESPONSES_HDR.NUMAR_DE_TELEFON]: "0741183398",
      [CFG.FORMS.FORM_RESPONSES_HDR.TIP_SEDINTE]: "Ambele variante sunt in regulă.",
      [CFG.FORMS.FORM_RESPONSES_HDR.IN_AFARA_ORASULUI]: "Nu",
      [CFG.FORMS.FORM_RESPONSES_HDR.DESCRIERE_MOTIV]: "Descriere motiv ...",
      [CFG.FORMS.FORM_RESPONSES_HDR.INTERVALE_LIBERE_PROGRAM]: "între orele 13:00-17:00",
      [CFG.FORMS.FORM_RESPONSES_HDR.DONATIE]: "venit între 2700 - 3200 RON - donație 150 RON",
      [CFG.FORMS.FORM_RESPONSES_HDR.DIAGNOSTIC]: "Diagnostic",
      [CFG.FORMS.FORM_RESPONSES_HDR.DE_UNDE_ATI_AUZIT_DE_NOI]: "De pe net",
      [CFG.FORMS.FORM_RESPONSES_HDR.ALTE_INFORMATII]: "Nu am alte info"
    };

    // Construim mock event-ul folosind functia din LIB
    const retMock = LibGW.createMockFormSubmitEventFromResponses(FORM_TEST_RESPONSES);
    if (retMock == null) {
      LibGW.Log(LibLogType.Error, "testOnFormSubmit: LibGW.createMockFormSubmitEventFromResponses failed: ");
      return;
    }

    // Ruleaza local handler-ul generic
    const retOnSubmit = onFormSubmit(retMock);
    LibGW.Log(LibLogType.Log, "testOnFormSubmit: retOnSubmit = " + JSON.stringify(retOnSubmit));
  }
  catch (err) {
    LibGW.Log(LibLogType.Error, "testOnFormSubmit: " + err.stack);
  }
  finally {
  }
}

function test_OnSpreadsheetEdit() {
  try {
    const retSpreadsheet = LibGW.openSpreadsheetByFileId(CFG.SHEETS.PRELUARE_BENEFICIARI.ID);
    if (retSpreadsheet.retCode !== LibRetCodeType.Succes || !retSpreadsheet.retVal) {
      LibGW.Log(LibLogType.Error, "testOnSpreadsheetEdit: openSpreadsheetByFileId failed: " + retSpreadsheet.retMsg);
      return;
    }

    const spreadsheet = retSpreadsheet.retVal;

    const sheet = LibGW.getSheetByNameFromSpreadsheet(spreadsheet, "Beneficiari");

    let protectionRez = null;
    const lockOpts =
    {
      waitMs: 5000,
      maxWaitMs: 30000,
      description: "TEMP_LOCK_PROIECT_SCRIPT"
    };


    const retProtect = LibGW.protectSheetTemporarily(sheet.retVal, lockOpts);
    protectionRez = retProtect.retVal;
    LibGW.unprotectSheetTemporarily(protectionRez, lockOpts);



  }
  catch (err) {
    Log(LibLogType.Error, "testOnSpreadsheetEdit: " + err.stack);
  }
}

function onSpreadsheetEdit_PreluareBeneficiari(e) {
  let gateKey = "";
  let protectionRez = null;
  const lockOpts =
  {
    waitMs: 5000,
    maxWaitMs: 30000,
    description: "TEMP_LOCK_PROIECT_SCRIPT"
  };
  let errMsg = null;

  try {
    // Validare minima event
    if (!e || !e.range || !e.source) {
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit: event invalid");
      return;
    }

    // Extrage contextul editului
    const spreadsheet = e.source;
    const range = e.range;
    const sheet = range.getSheet();

    if (!sheet) {
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit: sheet invalid");
      return;
    }

    const spreadsheetId = spreadsheet.getId();
    const sheetId = sheet.getSheetId();
    const sheetName = sheet.getName();
    const row = range.getRow();
    const col = range.getColumn();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    const watchedSpreadsheetId = CFG.SHEETS.PRELUARE_BENEFICIARI.ID;
    const requireSingleCellEdit = true;

    // Filtru
    if (
      spreadsheetId !== watchedSpreadsheetId ||
      (requireSingleCellEdit && (numRows !== 1 || numCols !== 1)) ||
      sheetName != CFG.SHEETS.PRELUARE_BENEFICIARI.BENEFICIARI.NAME ||
      col != CFG.SHEETS.PRELUARE_BENEFICIARI.ONEDIT_WATCHEDCELL_COL
    ) {
      LibGW.Log(LibLogType.Log, "onSpreadsheetEdit: ignored cell edit");
      return;
    }

    // Blocheaza re-entry / concurenta pe acelasi spreadsheet + sheet
    const retGate = LibGW.tryEnterExecutionGate("ONEDIT_GATE", [spreadsheetId, sheetId], 0);
    if (retGate.retCode !== LibRetCodeType.Succes || !retGate.retVal || !retGate.retVal.ok) {
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit: !tryEnterExecutionGate");
      return;
    }
    gateKey = retGate.retVal.gateKey;

    // Valorile sunt relevante doar dupa filtrul single-cell
    const oldValue = typeof e.oldValue === "undefined" ? null : e.oldValue;
    const newValue = typeof e.value === "undefined" ? range.getValue() : e.value;
    const newDisplayValue = range.getDisplayValue();

    LibGW.Log(
      LibLogType.Log,
      "onSpreadsheetEdit: edit valid pentru procesare " + JSON.stringify(
        {
          sheetName: sheetName,
          row: row,
          col: col,
          oldValue: oldValue,
          newValue: newValue,
          newDisplayValue: newDisplayValue
        }
      )
    );

    //-------------------------------------------------
    // Procesare specifica dupa numele celulei urmarite
    //-------------------------------------------------
    // Citire map header -> coloana
    var retGetHdrKeyToColMap = LibGW.getHeaderKeyToColMap(sheet);
    if (!retGetHdrKeyToColMap || typeof retGetHdrKeyToColMap !== "object") {
      retMsg = "LibGW.getHeaderKeyToColMap a returnat rezultat invalid";
      LibGW.Log(LibLogType.Error, retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const sheetHdrMap = retGetHdrKeyToColMap.retVal;

    const colID = sheetHdrMap[CFG.SHEETS.PRELUARE_BENEFICIARI.BENEFICIARI.HDR.ID];
    const colTerapeut = sheetHdrMap[CFG.SHEETS.PRELUARE_BENEFICIARI.BENEFICIARI.HDR.TERAPEUT];
    const colCheckbox = sheetHdrMap[CFG.SHEETS.PRELUARE_BENEFICIARI.BENEFICIARI.HDR.PREIA_BENEFICIAR];

    // Lock sheet
    const retProtect = LibGW.protectSheetTemporarily(sheet, lockOpts);
    if (retProtect.retCode !== LibRetCodeType.Succes) {
      LibGW.Log(LibLogType.Error, "protectSheetTemporarily failed: " + retProtect.retMsg);
      if (retProtect.retCode === LibRetCodeType.Eroare) {
        return { retCode: retProtect.retCode, retVal: null, retMsg: retProtect.retMsg };
      }
    }
    protectionRez = retProtect.retVal;

    //Schimba status beneficiar 
    const cellId = sheet.getRange(row, colID);
    const cellTerapeut = sheet.getRange(row, colTerapeut);
    const statusBeneficiar = CFG.SHEETS.MASTER.BENEFICIARI.STATUS.IN_PRELUARE;
    const ret = preluareBeneficiar(cellId.getDisplayValue(), cellTerapeut.getDisplayValue(), statusBeneficiar);
    if (ret.retCode != LibRetCodeType.Succes) {
      LibGW.Log(LibLogType.Error, ret.retMsg);
      return;
    }

    //sterge checkbox si terapeut 
    const cellCheckbox = sheet.getRange(row, colCheckbox);
    cellCheckbox.setValue(false);
    cellTerapeut.clearContent();


  }
  catch (err) {
    LibGW.Log(LibLogType.Error, "onSpreadsheetEdit: " + err.stack);
  }
  finally {
    if (gateKey) {
      LibGW.exitExecutionGate(gateKey);
    }

    if (protectionRez) {
      LibGW.unprotectSheetTemporarily(protectionRez, lockOpts);
    }

    if (errMsg) {
      LibGW.Log(LibLogType.Error, errMsg);
    }
  }
}


const CFG_TERAPEUT =
{
  SHEETS:
  {
    WATCHING:
      [
        "10JitWDmDAJ9F-tOtX38xgwq4m9xAdJJ5JmEPVlDYIN0", //Ovidiu
        "1iWutByKpH6M_FU-SVHm9cn6BFmiYU0fkz9dwO9dMLlk",  //Denisa
        "16c46amdZ0MWiFZOifjHv-ZE0EG0QXHNaUu4gLSjoyHM",  //Bianca
        "1PdP59k_ip5GXzjd8oXkqyTp_q2GehswnfrAGHpJ5Ktg",  //Iulia
        "1KbgiHens3zXOgNn6EAWIQ8bXpRTjqmRqoZ3rZCJASkM",  //Madalina
        "1-CyR8QEEuyWylKFL1eioopxbBsRzEeDP73yJXfpZP78",  //Emoke
        "13C7iaZSiIu30Vrs2cy0PAUMWUX-1Z7YkqNzy-SumoHM", //Mihaela
        "1GHX-wAqfSlV2p_uFoNYKsskNjwApunmuOEmjrEt3pjs", //Paula
        "1MyaFMn5HYV1FnZVrXpAg4CaSyRjPOO3z7v0ujOVgeho", //Raluca
        "1AFQTy4CHxvASRnb0Oy-v_F_i5DR6feOGbyQDLilwkLc", //Ramona
        "1u0zX2s49H0kR3ctdM64UYYtx8C1y9xASBcmNPskt1HY"  //Roxana
      ],

    ONEDIT_WATCHEDCELL_COL: 1,

    BENEFICIARI:
    {
      NAME: "Beneficiari",
      HDR:
      {
        UPDATE: "Update",
        STATUS_NOU: "Status nou",
        ID: "ID",
        STATUS: "Status",
        TERAPEUT: "Terapeut",
        NUME: "Nume",
        TELEFON: "Telefon",
        EMAIL: "Email",
        VARSTA: "Varsta",
        GENUL: "Genul",
        TIP_SEDINTE: "Tip sedinte",
        IN_AFARA_CLUJULUI: "In afara Clujului",
        DESCRIERE_MOTIV: "Descriere motiv",
        INTERVALE_PROGRAM: "Intervale program",
        DONATIE: "Donatie",
        DIAGNOSTIC: "Diagnostic",
        ALTE_INFORMATII: "Alte informații"
      }
    },

    CONFIG:
    {
      STATUS_NOU:
      {
        Preluat : "Preluat",
        SchimbTerapeut : "Schimb terapeut",
        NuiMaiTrebe : "Nu-i mai trebe"
      }
    }
  }
};


function setup_terapeut() {
  //TRIGGER ONSHEETEDIT
  for (const sheetId of CFG_TERAPEUT.SHEETS.WATCHING) {
    const installIOneditRet = LibGW.registerSpreadsheetOnEditTrigger(sheetId, "onSpreadsheetEdit_Terapeut");
    if (installIOneditRet.retCode !== LibRetCodeType.Succes) {
      retMsg = installIOneditRet.retMsg;
      LibGW.Log(LibLogType.Error, "registerSpreadsheetOnEditTrigger: " + retMsg);
      return {
        retCode: installIOneditRet.retCode,
        retVal: installIOneditRet.retVal,
        retMsg
      };
    }
  }

}

function test_OnSpreadsheetEdit() {
  try {
    const retSpreadsheet = LibGW.openSpreadsheetByFileId(CFG_TERAPEUT.SHEETS.WATCHING[0]);
    if (retSpreadsheet.retCode !== LibRetCodeType.Succes || !retSpreadsheet.retVal) {
      LibGW.Log(LibLogType.Error, "testOnSpreadsheetEdit: openSpreadsheetByFileId failed: " + retSpreadsheet.retMsg);
      return;
    }

    const spreadsheet = retSpreadsheet.retVal;

    simulateOnSpreadsheetEdit(
      spreadsheet,
      CFG_TERAPEUT.SHEETS.BENEFICIARI.NAME,
      2,
      1,
      "TRUE",
      "FALSE",
      onSpreadsheetEdit_Terapeut
    );
  }
  catch (err) {
    Log(LibLogType.Error, "testOnSpreadsheetEdit: " + err.stack);
  }
}

function onSpreadsheetEdit_Terapeut(e) {
  let retMsg = null;
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
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit_Terapeut: event invalid");
      return;
    }

    // Extrage contextul editului
    const spreadsheet = e.source;
    const range = e.range;
    const sheet = range.getSheet();

    if (!sheet) {
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit_Terapeut: sheet invalid");
      return;
    }

    const spreadsheetId = spreadsheet.getId();
    const sheetId = sheet.getSheetId();
    const sheetName = sheet.getName();
    const row = range.getRow();
    const col = range.getColumn();
    const numRows = range.getNumRows();
    const numCols = range.getNumColumns();

    const requireSingleCellEdit = true;

    // Filtru
    if (!CFG_TERAPEUT.SHEETS.WATCHING.includes(spreadsheetId) ||
      (requireSingleCellEdit && (numRows !== 1 || numCols !== 1)) ||
      sheetName != CFG_TERAPEUT.SHEETS.BENEFICIARI.NAME ||
      col != CFG_TERAPEUT.SHEETS.ONEDIT_WATCHEDCELL_COL) {
      LibGW.Log(LibLogType.Log, "onSpreadsheetEdit_Terapeut: ignored cell edit");
      return;
    }

    // Blocheaza re-entry / concurenta pe acelasi spreadsheet + sheet
    const retGate = LibGW.tryEnterExecutionGate("ONEDIT_GATE", [spreadsheetId, sheetId], 0);
    if (retGate.retCode !== LibRetCodeType.Succes || !retGate.retVal || !retGate.retVal.ok) {
      LibGW.Log(LibLogType.Error, "onSpreadsheetEdit_Terapeut: !tryEnterExecutionGate");
      return;
    }
    gateKey = retGate.retVal.gateKey;

    // Valorile sunt relevante doar dupa filtrul single-cell
    const oldValue = typeof e.oldValue === "undefined" ? null : e.oldValue;
    const newValue = typeof e.value === "undefined" ? range.getValue() : e.value;
    const newDisplayValue = range.getDisplayValue();

    LibGW.Log(
      LibLogType.Log,
      "onSpreadsheetEdit_Terapeut: edit valid pentru procesare " + JSON.stringify(
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

    const colCheckbox = sheetHdrMap[CFG_TERAPEUT.SHEETS.BENEFICIARI.HDR.UPDATE];
    const colStatusNou = sheetHdrMap[CFG_TERAPEUT.SHEETS.BENEFICIARI.HDR.STATUS_NOU];
    const colID = sheetHdrMap[CFG_TERAPEUT.SHEETS.BENEFICIARI.HDR.ID];
    const colTerapeut = sheetHdrMap[CFG_TERAPEUT.SHEETS.BENEFICIARI.HDR.TERAPEUT];

    //--------------------------------------
    // UPDATE BENEFICIAR
    //--------------------------------------
    const cellStatusNou = sheet.getRange(row, colStatusNou);
    const cellTerapeut = sheet.getRange(row, colTerapeut);
    const statusNou = cellStatusNou.getDisplayValue();
    let statusBeneficiar = null;
    let terapeut = null;
    switch (statusNou) {
      case CFG_TERAPEUT.SHEETS.CONFIG.STATUS_NOU.Preluat:
        statusBeneficiar = CFG.SHEETS.MASTER.BENEFICIARI.STATUS.PRELUAT;
        terapeut = cellTerapeut.getDisplayValue();
        break;

      case CFG_TERAPEUT.SHEETS.CONFIG.STATUS_NOU.NuiMaiTrebe:
        statusBeneficiar = CFG.SHEETS.MASTER.BENEFICIARI.STATUS.NU_I_MAI_TREBE;
        break;

      case CFG_TERAPEUT.SHEETS.CONFIG.STATUS_NOU.SchimbTerapeut:
        statusBeneficiar = CFG.SHEETS.MASTER.BENEFICIARI.STATUS.PRIORITAR;
        break;

      default:
        retMsg = "onSpreadsheetEdit_Terapeut: Valoare netratata in switch(): " + statusNou;
        LibGW.Log(LibLogType.Warning, retMsg);
        return { retCode: LibRetCodeType.Eroare, retVal: null, retMsg };
    }

    //Protect sheet
    const retProtect = LibGW.protectSheetTemporarily(sheet, lockOpts);
    if (retProtect.retCode !== LibRetCodeType.Succes) {
      LibGW.Log(LibLogType.Error, "protectSheetTemporarily failed: " + retProtect.retMsg);
      if (retProtect.retCode === LibRetCodeType.Eroare) {
        return { retCode: retProtect.retCode, retVal: null, retMsg: retProtect.retMsg };
      }
    }
    protectionRez = retProtect.retVal;

    //Update Beneficiar MASTER
    const cellId = sheet.getRange(row, colID);
    const ret = preluareBeneficiar(cellId.getDisplayValue(), terapeut, statusBeneficiar);
    if (ret.retCode != LibRetCodeType.Succes) {
      LibGW.Log(LibLogType.Error, ret.retMsg);
      return;
    }

    //Sterge Checkbox si StatusNou 
    const cellCheckbox = sheet.getRange(row, colCheckbox);
    cellCheckbox.setValue(false);
    cellStatusNou.clearContent();
  }
  catch (err) {
    LibGW.Log(LibLogType.Error, "onSpreadsheetEdit_Terapeut: " + err.stack);
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
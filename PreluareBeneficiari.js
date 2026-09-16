function setup_preluarebeneficiari() {
  //TRIGGER ONSHEETEDIT
  const installIOneditRet = LibGW.registerSpreadsheetOnEditTrigger(CFG.SHEETS.PRELUARE_BENEFICIARI.ID, "onSpreadsheetEdit_PreluareBeneficiari");
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


function test_preluareBeneficiar() {
  const ret = preluareBeneficiar("B_TDE215", "Mezei Emoke (0752145363)", CFG.SHEETS.MASTER.BENEFICIARI.STATUS.IN_PRELUARE);
}



/**
 * EXTERN: Marcheaza un beneficiar ca fiind preluat de un terapeut.
 *
 * Input:
 * - id: string; ID-ul beneficiarului
 * - email_terapeut: string; email-ul terapeutului care preia beneficiarul
 *
 * retVal:
 * - null
 *
 * Reguli:
 * - cauta beneficiarul in sheet-ul BENEFICIARI dupa coloana ID
 * - daca beneficiarul nu exista, returneaza eroare
 * - beneficiar poate fi preluat doar daca:
 *   - status este NOU sau PRIORITAR
 *   - terapeut este gol
 * - seteaza TERAPEUT = email_terapeut
 * - seteaza STATUS = IN_PRELUARE
 */
function preluareBeneficiar(id, email_terapeut, status) {
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
    if (typeof id !== "string" || !id.trim()) {
      retMsg = "id lipsa sau invalid";
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    // if (typeof email_terapeut !== "string" || !email_terapeut.trim()) {
    //   retMsg = "email_terapeut lipsa sau invalid";
    //   LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
    //   return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    // }

    id = id.trim();

    // Deschidere Master
    const retOpen = LibGW.openSpreadsheetByFileId(CFG.SHEETS.MASTER.ID);
    if (!retOpen || retOpen.retCode !== LibRetCodeType.Succes || !retOpen.retVal) {
      retMsg = "LibGW.openSpreadsheetByFileId failed: " + (retOpen ? retOpen.retMsg : "");
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const spreadsheet = retOpen.retVal;

    // Deschidere sheet Beneficiari
    const retGetSheet = LibGW.getSheetByNameFromSpreadsheet(spreadsheet, CFG.SHEETS.MASTER.BENEFICIARI.NAME);
    if (!retGetSheet || retGetSheet.retCode !== LibRetCodeType.Succes || !retGetSheet.retVal) {
      retMsg = "LibGW.getSheetByNameFromSpreadsheet failed: " + (retGetSheet ? retGetSheet.retMsg : "");
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const shBeneficiari = retGetSheet.retVal;

    // Citire map header -> coloana
    const retGetHdrKeyToColMap = LibGW.getHeaderKeyToColMap(shBeneficiari);
    if (!retGetHdrKeyToColMap || retGetHdrKeyToColMap.retCode !== LibRetCodeType.Succes || !retGetHdrKeyToColMap.retVal) {
      retMsg = "LibGW.getHeaderKeyToColMap failed: " + (retGetHdrKeyToColMap ? retGetHdrKeyToColMap.retMsg : "");
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const beneficiarHdrMap = retGetHdrKeyToColMap.retVal;

    const colID = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.ID];
    const colStatus = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.STATUS];
    const colTerapeut = beneficiarHdrMap[CFG.SHEETS.MASTER.BENEFICIARI.HDR.TERAPEUT];

    if (!colID || !Number.isInteger(colID) || colID < 1) {
      retMsg = 'coloana "' + CFG.SHEETS.MASTER.BENEFICIARI.HDR.ID + '" nu a fost gasita in header';
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    if (!colStatus || !Number.isInteger(colStatus) || colStatus < 1) {
      retMsg = 'coloana "' + CFG.SHEETS.MASTER.BENEFICIARI.HDR.STATUS + '" nu a fost gasita in header';
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    if (!colTerapeut || !Number.isInteger(colTerapeut) || colTerapeut < 1) {
      retMsg = 'coloana "' + CFG.SHEETS.MASTER.BENEFICIARI.HDR.TERAPEUT + '" nu a fost gasita in header';
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    // Cautare beneficiar dupa ID
    const retFindId = LibGW.findCellByText(
      shBeneficiari,
      id,
      1,
      shBeneficiari.getLastRow(),
      true
    );

    if (!retFindId || retFindId.retCode === LibRetCodeType.Eroare) {
      retMsg = "findCellByText failed: " + (retFindId ? retFindId.retMsg : "");
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    if (!retFindId.retVal) {
      retMsg = "beneficiarul cu id-ul \"" + id + "\" nu exista";
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    const beneficiarRow = retFindId.retVal.rowNumber;
    if (!beneficiarRow || !Number.isInteger(beneficiarRow) || beneficiarRow < 2) {
      retMsg = "row beneficiar invalid";
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }

    // Lock sheet
    const retProtect = LibGW.protectSheetTemporarily(shBeneficiari, lockOpts);
    if (!retProtect || retProtect.retCode !== LibRetCodeType.Succes || !retProtect.retVal) {
      retMsg = "LibGW.protectSheetTemporarily failed: " + (retProtect ? retProtect.retMsg : "");
      LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + retMsg);
      return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
    }
    protectionRez = retProtect.retVal;

    // Recitim valorile relevante sub lock
    const statusCell = shBeneficiari.getRange(beneficiarRow, colStatus);
    const terapeutCell = shBeneficiari.getRange(beneficiarRow, colTerapeut);

    // const statusCurent = String(statusCell.getValue() || "").trim();
    // const terapeutCurent = String(terapeutCell.getValue() || "").trim();

    // if (
    //   statusCurent !== CFG.SHEETS.MASTER.BENEFICIARI.STATUS.NOU &&
    //   statusCurent !== CFG.SHEETS.MASTER.BENEFICIARI.STATUS.PRIORITAR
    // )
    // {
    //   retMsg = "beneficiarul nu poate fi preluat; status curent: " + statusCurent;
    //   LibGW.Log(LibLogType.Warning, "preluareBeneficiar: " + retMsg);
    //   return { retCode: LibRetCodeType.Warning, retVal, retMsg };
    // }

    // if (terapeutCurent)
    // {
    //   retMsg = "beneficiarul este deja alocat terapeutului: " + terapeutCurent;
    //   LibGW.Log(LibLogType.Warning, "preluareBeneficiar: " + retMsg);
    //   return { retCode: LibRetCodeType.Warning, retVal, retMsg };
    // }

    // Update beneficiar
    terapeutCell.setValue(email_terapeut);
    statusCell.setValue(status);

    SpreadsheetApp.flush();

    LibGW.Log(LibLogType.Log, "preluareBeneficiar: beneficiar preluat cu succes: id: " + id + ", email: " + email_terapeut + ", status:" + status);
    return { retCode: LibRetCodeType.Succes, retVal, retMsg };
  }
  catch (err) {
    retMsg = "exceptie la preluare beneficiar";
    LibGW.Log(LibLogType.Error, "preluareBeneficiar: " + err.stack);
    return { retCode: LibRetCodeType.Eroare, retVal, retMsg };
  }
  finally {
    if (protectionRez) {
      LibGW.unprotectSheetTemporarily(protectionRez, lockOpts);
    }
  }
}

const CFG =
{
  SHEETS:
  {
    MASTER:
    {
      ID: "13Vh8YP_CHLMO8sXyrDykoSYYo1ZsP9k09I8S6MWTHMc",
      BENEFICIARI:
      {
        NAME: "Beneficiari",
        HDR:
        {
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
          DE_UNDE_ATI_AUZIT_DE_NOI: "De unde ati auzit de noi",
          ALTE_INFORMATII: "Alte informații",
          DATA_INSCRIERE: "Data inscriere"
        },
        STATUS:
        {
          NOU: "Nou",
          PRIORITAR: "Prioritar",
          IN_PRELUARE: "In preluare",
          PRELUAT: "Preluat",
          NU_I_MAI_TREBE: "Nu-i mai trebe",
          INCHEIAT: "Incheiat",
          EROARE_APPSCRIPT: "Eroare AppScript"
        }
      },
      CONFIG:
      {
        NAME: "Config",
        HDR:
        {
          STATUS_BENEFICIARI: "STATUS_BENEFICIARI",
          PRIORITATI_PRELUARE: "PRIORITATI_PRELUARE",
          DROPDOWN_TERAPEUTI: "DROPDOWN_TERAPEUTI",
        },
        DROPDOWN_STYLES_ROWS:
        {
          STATUS_BENEFICIARI: 23,
          PRIORITATI_PRELUARE: 23,
          DROPDOWN_TERAPEUTI: 2,
        }
      }
    },

    PRELUARE_BENEFICIARI:
    {
      ID: "1Fw_xaZGFGLnNMx5FrFev2nIm4jpiBVgABtT0prS5utk",

      ONEDIT_WATCHEDCELL_COL: 1,

      BENEFICIARI:
      {
        NAME: "Beneficiari",
        HDR:
        {
          PREIA_BENEFICIAR: "Preia beneficiar",
          TERAPEUT: "Terapeut",
          ID: "ID",
          STATUS: "Status",
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
      }

    }
  },

  FORMS:
  {
    FORM_ID: "1pCPRuRVx443ie9EPIk2HLOEPhjIDIiN_DXkmqm25n9M",
    FORM_RESPONSES_HDR:
    {
      TIMESTAMP: "Timestamp",
      EMAIL_ADDRESS: "Email Address",
      SUNT_DE_ACORD: "Sunt de acord cu procesarea datelor mele cu caracter personal de către organizație, respectându-se confidențialitatea. \n\nPentru a putea procesa înscrierea ta, avem nevoie să îți dai acordul pentru procesarea datelor. Politica de confidențialitate Minte Forte privind stocarea și prelucrarea datelor o poți consulta aici: https://minteforte.ro/politica-de-confidentialitate/",
      NUMELE_SI_PRENUMELE: "Numele și prenumele",
      VARSTA: "Vârsta",
      GENUL: "Genul",
      NUMAR_DE_TELEFON: "Număr de telefon",
      TIP_SEDINTE: "Preferați ședințele online sau fizic?\n\nUnele persoane doresc și/sau sunt obligate de situație să participe doar online sau fizic la întâlniri. Acest lucru este valabil și pentru psihoterapeuții din echipă.",
      IN_AFARA_ORASULUI: "Locuiți în afara orașului Cluj-Napoca?",
      DESCRIERE_MOTIV: "Oferiți o scurtă descriere a motivului pentru care aveți nevoie de sprijin:",
      INTERVALE_LIBERE_PROGRAM: `Care sunt intervalele dvs. libere/flexibile din program (excepție weekend - nu suntem disponibili)? (Această întrebare are scopul de a evalua disponibilitatea, respectiv restricțiile dvs. de program, pentru a gestiona mai bine alocarea unui terapeut din echipă. Terapeuții din echipă au programe diferite de lucru, și împărțirea spațiul fizic de lucru impune anumite restricții)

*Se pot bifa mai multe intervale`,
      DONATIE: "Misiunea organizației noastre este de a ajuta în mod prioritar grupurile dezavantajate socio-economic. În acest sens, avem un sistem de evaluare personală a resurselor de venit pentru stabilirea categoriei de donație pentru ședințele de psihoterapie. Vă rugăm să evaluați suma resurselor financiare lunare de care dispuneți în prezent (venit net lunar, sprijin financiar din partea unui membru al familiei, economii, burse academice, venituri neimpozabile, etc.), și să alegeți donația în care vă încadrați. Prin alegerea donației declarați faptul că ați luat la cunoștință scopul sistemului de evaluare personală.",
      DIAGNOSTIC: "Aveți un diagnostic psihiatric și/sau urmați un tratament medicamentos? (Dacă răspunsul este DA la oricare din cele două întrebări, vă rugăm detaliați)",
      DE_UNDE_ATI_AUZIT_DE_NOI: "De unde ați auzit/ știți de noi?",
      ALTE_INFORMATII: "Alte informații pe care doriți să ni le transmiteți? (ex. preferințe pentru psihologul cu care veți lucra sau limba - maghiară/ engleză)"
    }
  },

  DRIVE:
  {

  }
};

function getCFG() {
  return CFG_TERAPEUT;
}
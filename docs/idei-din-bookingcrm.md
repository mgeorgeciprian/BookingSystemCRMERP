# Idei preluate din BookingCRM (fără cod)

Sursa: repo-ul `mgeorgeciprian/BookingSystemCRMERP`, analizat de `master-architect` pe 2026-11-25. Nu se portează cod din BookingCRM. Mai jos sunt doar cazuri de test și idei, gata de lipit în issue-uri.

---

## Pentru #160: rezervare online (și feliile #180–#192)

Cazuri de test luate din `tests/test_public_booking.py` din BookingCRM, de adaptat la rutarea pe gazdă din ADR 0013 (fără slug în URL):

1. Firmă inexistentă sau portal nepublicat: răspuns uniform 404, fără să se vadă dacă firma există.
2. Lista de servicii conține doar serviciile active și marcate ca rezervabile online.
3. Lista de specialiști conține doar specialiștii activi și rezervabili.
4. Intervalele libere nu includ ore din trecut (calculat în Europe/Bucharest, nu în UTC).
5. Rezervarea fără acord bifat e refuzată (acordul nu are valoare implicită adevărată).
6. Rezervarea pe un interval deja ocupat întoarce 409, inclusiv la două cereri simultane (EXCLUDE în baza de date, nu doar o verificare în aplicație).
7. O rezervare reușită creează programarea în starea corectă (confirmare automată sau manuală, după setarea firmei).

Cazuri suplimentare, din bug-urile găsite în BookingCRM:

- Ora cerută trebuie să fie în programul specialistului, iar specialistul să facă serviciul ales.
- Mai multe suprapuneri existente nu trebuie să dea eroare 500.
- Un telefon introdus de altcineva nu se leagă automat de clientul existent cu acel număr fără verificare OTP.

Pentru #159 (mini-site), câmpurile afișate public de BookingCRM, ca listă de verificat: nume, descriere, verticală, adresă, oraș, telefon, e-mail, website, logo, copertă, program de lucru, politica de anulare, culoare de brand.

---

## Pentru #173: reamintiri prin adaptorul ADR 0006

Lecții din bug-urile BookingCRM, de transformat în teste:

- Idempotență pe reamintire: un job care rulează la 15 minute, cu fereastră de ±30 de minute, trimitea până la 4 SMS-uri pe aceeași programare. Testul: rulări repetate ale jobului trimit o singură reamintire pe tip.
- Ora din mesaj se afișează în Europe/Bucharest, nu în UTC (inclusiv la trecerea la ora de vară/iarnă).
- Nicio trimitere fără acord pe canal sau după dezabonare.
- Jurnalul nu păstrează textul complet al mesajului și nici destinatarul în clar.
- Mesajul nu conține numele serviciului pentru tenanții medicali (D20).
- Marcarea neprezentărilor se face pe tenant, nu global.

Idei de mesaje (de rescris cu diacritice și fără date clinice): anularea programării, neprezentare, cerere de recenzie după vizită.

---

## Pentru #188: prag de neprezentări

- Contor de neprezentări pe client (crește la marcarea „neprezentat”), folosit pentru pragul din felia 3B.

---

## Fără issue încă: rapoarte

Nova Kronsoft nu are încă API de rapoarte. Indicatori din `api/v1/reports.py` și `dashboard.py` din BookingCRM, ca listă pentru un viitor modul:

- programări pe stare (confirmate, finalizate, anulate, neprezentări), pe perioadă;
- încasări pe perioadă și pe specialist;
- rata de neprezentare;
- clienți noi pe perioadă și clienți care revin;
- servicii cele mai cerute.

---

## Parcat: iCal (Airbnb / Booking.com)

Doar dacă se decide o verticală de cazare și există aviz `gdpr-juridic` (ADR 0011). Cazuri de test pentru parser, de păstrat:

- eveniment DATE pe zi întreagă (în Europe/Bucharest);
- lipsă DTEND, dar cu DURATION;
- lipsă UID;
- eveniment mai vechi decât pragul de reținere;
- rezumate Airbnb „Reserved - X” și „Not available”, Booking.com „CLOSED”;
- PRODID necunoscut;
- un feed gol nu trebuie să șteargă toate blocările existente;
- evenimente recurente (RRULE) expandate.

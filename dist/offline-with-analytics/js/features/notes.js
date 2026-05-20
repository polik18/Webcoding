// js/features/notes.js
// Responsibility: Todo-note tab creation, visual checklist editing helpers, and
// local-first syncing of checkbox state back into the HTML document.
(function () {
    'use strict';

const NOTE_I18N = {
    "ar": {
        "notes.newBtn": "ملاحظات",
        "notes.newTitle": "إنشاء تبويب مهام",
        "notes.newMenu": "ملاحظة مهام",
        "notes.toolbarTitle": "ملاحظة مهام",
        "notes.toolbarHint": "يتم حفظ العناصر المحددة تلقائياً",
        "notes.inputPlaceholder": "أدخل مهمة...",
        "notes.addBtn": "إضافة",
        "notes.clearBtn": "مسح المنجز",
        "notes.clearTitle": "إزالة المهام المكتملة",
        "notes.fileBase": "ملاحظة_مهام",
        "notes.title": "ملاحظة مهام",
        "notes.kicker": "قائمة مهام",
        "notes.subtitle": "اكتب المهام وحدد المكتمل منها واحفظ كل شيء في ملاحظة HTML محلية.",
        "notes.quickHint": "تلميح: استخدم شريط الإدخال أعلى المعاينة للإضافة السريعة.",
        "notes.initialOne": "اكتب أول مهمة هنا",
        "notes.initialTwo": "انقر مربع الاختيار عند الانتهاء",
        "notes.initialThree": "أضف المزيد من الشريط العلوي",
        "notes.freeTitle": "ملاحظات",
        "notes.freePlaceholder": "اكتب تفاصيل إضافية هنا...",
        "notes.itemPlaceholder": "مهمة جديدة",
        "notes.toastCreated": "تم إنشاء ملاحظة المهام.",
        "notes.toastAdded": "تمت إضافة المهمة.",
        "notes.toastNeedText": "يرجى إدخال مهمة أولاً.",
        "notes.toastCleared": "تمت إزالة العناصر المكتملة.",
        "notes.toastNothingClear": "لا توجد عناصر مكتملة لمسحها.",
        "notes.toastCreateFailed": "ملاحظة المهام ليست جاهزة بعد."
    },
    "bn": {
        "notes.newBtn": "নোট",
        "notes.newTitle": "কাজের নোট ট্যাব তৈরি করুন",
        "notes.newMenu": "কাজের নোট",
        "notes.toolbarTitle": "কাজের নোট",
        "notes.toolbarHint": "টিক দেওয়া আইটেম স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়",
        "notes.inputPlaceholder": "একটি কাজ লিখুন...",
        "notes.addBtn": "যোগ করুন",
        "notes.clearBtn": "সম্পন্ন মুছুন",
        "notes.clearTitle": "সম্পন্ন কাজ মুছুন",
        "notes.fileBase": "কাজের_নোট",
        "notes.title": "কাজের নোট",
        "notes.kicker": "কাজের তালিকা",
        "notes.subtitle": "কাজ লিখুন, সম্পন্ন আইটেম টিক দিন এবং সবকিছু এই স্থানীয় HTML নোটে রাখুন।",
        "notes.quickHint": "পরামর্শ: দ্রুত যোগ করতে প্রিভিউর উপরের ইনপুট বার ব্যবহার করুন।",
        "notes.initialOne": "আপনার প্রথম কাজ এখানে লিখুন",
        "notes.initialTwo": "সম্পন্ন হলে চেকবক্সে ক্লিক করুন",
        "notes.initialThree": "উপরের টুলবার থেকে আরও যোগ করুন",
        "notes.freeTitle": "নোট",
        "notes.freePlaceholder": "অতিরিক্ত বিস্তারিত এখানে লিখুন...",
        "notes.itemPlaceholder": "নতুন কাজ",
        "notes.toastCreated": "কাজের নোট তৈরি হয়েছে।",
        "notes.toastAdded": "কাজ যোগ হয়েছে।",
        "notes.toastNeedText": "আগে একটি কাজ লিখুন।",
        "notes.toastCleared": "সম্পন্ন আইটেম সরানো হয়েছে।",
        "notes.toastNothingClear": "মোছার মতো সম্পন্ন আইটেম নেই।",
        "notes.toastCreateFailed": "কাজের নোট এখনও প্রস্তুত নয়।"
    },
    "cs": {
        "notes.newBtn": "Poznámky",
        "notes.newTitle": "Poznámka úkolů",
        "notes.newMenu": "Poznámka úkolů",
        "notes.toolbarTitle": "Poznámka úkolů",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Zadejte úkol...",
        "notes.addBtn": "Přidat",
        "notes.clearBtn": "Smazat hotové",
        "notes.clearTitle": "Smazat hotové",
        "notes.fileBase": "Poznamka_ukolu",
        "notes.title": "Poznámka úkolů",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Poznámky",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "da": {
        "notes.newBtn": "Noter",
        "notes.newTitle": "Opgavenote",
        "notes.newMenu": "Opgavenote",
        "notes.toolbarTitle": "Opgavenote",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Indtast en opgave...",
        "notes.addBtn": "Tilføj",
        "notes.clearBtn": "Ryd færdige",
        "notes.clearTitle": "Ryd færdige",
        "notes.fileBase": "Opgavenote",
        "notes.title": "Opgavenote",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Noter",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "de": {
        "notes.newBtn": "Notizen",
        "notes.newTitle": "Aufgaben-Notiz erstellen",
        "notes.newMenu": "Aufgaben-Notiz",
        "notes.toolbarTitle": "Aufgaben-Notiz",
        "notes.toolbarHint": "Abgehakte Einträge werden automatisch gespeichert",
        "notes.inputPlaceholder": "Aufgabe eingeben...",
        "notes.addBtn": "Hinzufügen",
        "notes.clearBtn": "Erledigte löschen",
        "notes.clearTitle": "Erledigte Aufgaben entfernen",
        "notes.fileBase": "Aufgaben_Notiz",
        "notes.title": "Aufgaben-Notiz",
        "notes.kicker": "Aufgabenliste",
        "notes.subtitle": "Schreiben Sie Aufgaben, haken Sie erledigte Punkte ab und speichern Sie alles in dieser lokalen HTML-Notiz.",
        "notes.quickHint": "Tipp: Über die Eingabeleiste oberhalb der Vorschau schnell hinzufügen.",
        "notes.initialOne": "Erste Aufgabe hier eingeben",
        "notes.initialTwo": "Bei Erledigung das Kästchen anklicken",
        "notes.initialThree": "Weitere Punkte über die obere Leiste hinzufügen",
        "notes.freeTitle": "Notizen",
        "notes.freePlaceholder": "Weitere Details hier schreiben...",
        "notes.itemPlaceholder": "Neue Aufgabe",
        "notes.toastCreated": "Aufgaben-Notiz erstellt.",
        "notes.toastAdded": "Aufgabe hinzugefügt.",
        "notes.toastNeedText": "Bitte zuerst eine Aufgabe eingeben.",
        "notes.toastCleared": "Erledigte Einträge entfernt.",
        "notes.toastNothingClear": "Keine erledigten Einträge zum Löschen.",
        "notes.toastCreateFailed": "Aufgaben-Notiz ist noch nicht bereit."
    },
    "el": {
        "notes.newBtn": "Σημειώσεις",
        "notes.newTitle": "Σημείωση εργασιών",
        "notes.newMenu": "Σημείωση εργασιών",
        "notes.toolbarTitle": "Σημείωση εργασιών",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Πληκτρολογήστε εργασία...",
        "notes.addBtn": "Προσθήκη",
        "notes.clearBtn": "Εκκαθάριση ολοκληρωμένων",
        "notes.clearTitle": "Εκκαθάριση ολοκληρωμένων",
        "notes.fileBase": "Simeiosi_Ergasion",
        "notes.title": "Σημείωση εργασιών",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Σημειώσεις",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "en": {
        "notes.newBtn": "Notes",
        "notes.newTitle": "Create a todo note tab",
        "notes.newMenu": "Todo Note",
        "notes.toolbarTitle": "Todo Note",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Enter a todo item...",
        "notes.addBtn": "Add",
        "notes.clearBtn": "Clear done",
        "notes.clearTitle": "Remove completed todo items",
        "notes.fileBase": "Todo_Note",
        "notes.title": "Todo Note",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notes",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "es": {
        "notes.newBtn": "Notas",
        "notes.newTitle": "Crear pestaña de tareas",
        "notes.newMenu": "Nota de tareas",
        "notes.toolbarTitle": "Nota de tareas",
        "notes.toolbarHint": "Los marcados se guardan automáticamente",
        "notes.inputPlaceholder": "Escribe una tarea...",
        "notes.addBtn": "Agregar",
        "notes.clearBtn": "Borrar hechas",
        "notes.clearTitle": "Eliminar tareas completadas",
        "notes.fileBase": "Nota_Tareas",
        "notes.title": "Nota de tareas",
        "notes.kicker": "Lista de tareas",
        "notes.subtitle": "Escribe tareas, marca las completadas y guarda todo en esta nota HTML local.",
        "notes.quickHint": "Consejo: usa la barra superior para añadir tareas rápidamente.",
        "notes.initialOne": "Escribe tu primera tarea aquí",
        "notes.initialTwo": "Haz clic en la casilla cuando esté hecha",
        "notes.initialThree": "Agrega más desde la barra superior",
        "notes.freeTitle": "Notas",
        "notes.freePlaceholder": "Escribe detalles adicionales aquí...",
        "notes.itemPlaceholder": "Nueva tarea",
        "notes.toastCreated": "Nota de tareas creada.",
        "notes.toastAdded": "Tarea agregada.",
        "notes.toastNeedText": "Primero escribe una tarea.",
        "notes.toastCleared": "Tareas completadas eliminadas.",
        "notes.toastNothingClear": "No hay tareas completadas para borrar.",
        "notes.toastCreateFailed": "La nota de tareas aún no está lista."
    },
    "fi": {
        "notes.newBtn": "Muistiinpanot",
        "notes.newTitle": "Tehtävämuistiinpano",
        "notes.newMenu": "Tehtävämuistiinpano",
        "notes.toolbarTitle": "Tehtävämuistiinpano",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Kirjoita tehtävä...",
        "notes.addBtn": "Lisää",
        "notes.clearBtn": "Poista valmiit",
        "notes.clearTitle": "Poista valmiit",
        "notes.fileBase": "Tehtava_muistiinpano",
        "notes.title": "Tehtävämuistiinpano",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Muistiinpanot",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "fr": {
        "notes.newBtn": "Notes",
        "notes.newTitle": "Créer un onglet de tâches",
        "notes.newMenu": "Note de tâches",
        "notes.toolbarTitle": "Note de tâches",
        "notes.toolbarHint": "Les éléments cochés sont enregistrés",
        "notes.inputPlaceholder": "Saisir une tâche...",
        "notes.addBtn": "Ajouter",
        "notes.clearBtn": "Effacer terminées",
        "notes.clearTitle": "Supprimer les tâches terminées",
        "notes.fileBase": "Note_Taches",
        "notes.title": "Note de tâches",
        "notes.kicker": "Liste de tâches",
        "notes.subtitle": "Écrivez vos tâches, cochez celles terminées et gardez tout dans cette note HTML locale.",
        "notes.quickHint": "Astuce : utilisez la barre au-dessus de l’aperçu pour ajouter rapidement.",
        "notes.initialOne": "Saisissez votre première tâche ici",
        "notes.initialTwo": "Cochez la case quand elle est terminée",
        "notes.initialThree": "Ajoutez d’autres éléments depuis la barre",
        "notes.freeTitle": "Notes",
        "notes.freePlaceholder": "Écrivez des détails ici...",
        "notes.itemPlaceholder": "Nouvelle tâche",
        "notes.toastCreated": "Note de tâches créée.",
        "notes.toastAdded": "Tâche ajoutée.",
        "notes.toastNeedText": "Veuillez d’abord saisir une tâche.",
        "notes.toastCleared": "Éléments terminés supprimés.",
        "notes.toastNothingClear": "Aucun élément terminé à supprimer.",
        "notes.toastCreateFailed": "La note de tâches n’est pas encore prête."
    },
    "he": {
        "notes.newBtn": "פתקים",
        "notes.newTitle": "פתק משימות",
        "notes.newMenu": "פתק משימות",
        "notes.toolbarTitle": "פתק משימות",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "הקלד משימה...",
        "notes.addBtn": "הוסף",
        "notes.clearBtn": "נקה שהושלמו",
        "notes.clearTitle": "נקה שהושלמו",
        "notes.fileBase": "פתק_משימות",
        "notes.title": "פתק משימות",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "פתקים",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "hi": {
        "notes.newBtn": "नोट्स",
        "notes.newTitle": "कार्य नोट टैब बनाएँ",
        "notes.newMenu": "कार्य नोट",
        "notes.toolbarTitle": "कार्य नोट",
        "notes.toolbarHint": "चेक किए गए आइटम अपने-आप सहेजे जाते हैं",
        "notes.inputPlaceholder": "कार्य लिखें...",
        "notes.addBtn": "जोड़ें",
        "notes.clearBtn": "पूर्ण हटाएँ",
        "notes.clearTitle": "पूर्ण कार्य हटाएँ",
        "notes.fileBase": "कार्य_नोट",
        "notes.title": "कार्य नोट",
        "notes.kicker": "कार्य सूची",
        "notes.subtitle": "कार्य लिखें, पूर्ण आइटम चेक करें और सब कुछ इस स्थानीय HTML नोट में रखें।",
        "notes.quickHint": "सुझाव: जल्दी जोड़ने के लिए पूर्वावलोकन के ऊपर इनपुट बार का उपयोग करें।",
        "notes.initialOne": "अपना पहला कार्य यहाँ लिखें",
        "notes.initialTwo": "पूरा होने पर चेकबॉक्स क्लिक करें",
        "notes.initialThree": "ऊपर की टूलबार से और जोड़ें",
        "notes.freeTitle": "नोट्स",
        "notes.freePlaceholder": "अतिरिक्त विवरण यहाँ लिखें...",
        "notes.itemPlaceholder": "नया कार्य",
        "notes.toastCreated": "कार्य नोट बनाया गया।",
        "notes.toastAdded": "कार्य जोड़ा गया।",
        "notes.toastNeedText": "कृपया पहले कार्य लिखें।",
        "notes.toastCleared": "पूर्ण आइटम हटाए गए।",
        "notes.toastNothingClear": "हटाने के लिए कोई पूर्ण आइटम नहीं।",
        "notes.toastCreateFailed": "कार्य नोट अभी तैयार नहीं है।"
    },
    "hu": {
        "notes.newBtn": "Jegyzetek",
        "notes.newTitle": "Teendő jegyzet",
        "notes.newMenu": "Teendő jegyzet",
        "notes.toolbarTitle": "Teendő jegyzet",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Írjon be egy teendőt...",
        "notes.addBtn": "Hozzáadás",
        "notes.clearBtn": "Kész törlése",
        "notes.clearTitle": "Kész törlése",
        "notes.fileBase": "Teendo_Jegyzet",
        "notes.title": "Teendő jegyzet",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Jegyzetek",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "id": {
        "notes.newBtn": "Catatan",
        "notes.newTitle": "Buat tab catatan tugas",
        "notes.newMenu": "Catatan tugas",
        "notes.toolbarTitle": "Catatan tugas",
        "notes.toolbarHint": "Item yang dicentang tersimpan otomatis",
        "notes.inputPlaceholder": "Masukkan tugas...",
        "notes.addBtn": "Tambah",
        "notes.clearBtn": "Hapus selesai",
        "notes.clearTitle": "Hapus tugas selesai",
        "notes.fileBase": "Catatan_Tugas",
        "notes.title": "Catatan tugas",
        "notes.kicker": "Daftar tugas",
        "notes.subtitle": "Tulis tugas, centang yang selesai, dan simpan semuanya di catatan HTML lokal ini.",
        "notes.quickHint": "Tips: gunakan bilah input di atas pratinjau untuk menambah cepat.",
        "notes.initialOne": "Tulis tugas pertama di sini",
        "notes.initialTwo": "Klik kotak centang saat selesai",
        "notes.initialThree": "Tambah lagi dari bilah atas",
        "notes.freeTitle": "Catatan",
        "notes.freePlaceholder": "Tulis detail tambahan di sini...",
        "notes.itemPlaceholder": "Tugas baru",
        "notes.toastCreated": "Catatan tugas dibuat.",
        "notes.toastAdded": "Tugas ditambahkan.",
        "notes.toastNeedText": "Masukkan tugas terlebih dahulu.",
        "notes.toastCleared": "Item selesai dihapus.",
        "notes.toastNothingClear": "Tidak ada item selesai untuk dihapus.",
        "notes.toastCreateFailed": "Catatan tugas belum siap."
    },
    "it": {
        "notes.newBtn": "Note",
        "notes.newTitle": "Crea scheda attività",
        "notes.newMenu": "Nota attività",
        "notes.toolbarTitle": "Nota attività",
        "notes.toolbarHint": "Le spunte vengono salvate automaticamente",
        "notes.inputPlaceholder": "Inserisci un’attività...",
        "notes.addBtn": "Aggiungi",
        "notes.clearBtn": "Cancella fatte",
        "notes.clearTitle": "Rimuovi attività completate",
        "notes.fileBase": "Nota_Attivita",
        "notes.title": "Nota attività",
        "notes.kicker": "Lista attività",
        "notes.subtitle": "Scrivi attività, spunta quelle completate e conserva tutto in questa nota HTML locale.",
        "notes.quickHint": "Suggerimento: usa la barra sopra l’anteprima per aggiungere rapidamente.",
        "notes.initialOne": "Scrivi qui la prima attività",
        "notes.initialTwo": "Fai clic sulla casella quando è completata",
        "notes.initialThree": "Aggiungi altri elementi dalla barra superiore",
        "notes.freeTitle": "Note",
        "notes.freePlaceholder": "Scrivi qui altri dettagli...",
        "notes.itemPlaceholder": "Nuova attività",
        "notes.toastCreated": "Nota attività creata.",
        "notes.toastAdded": "Attività aggiunta.",
        "notes.toastNeedText": "Inserisci prima un’attività.",
        "notes.toastCleared": "Elementi completati rimossi.",
        "notes.toastNothingClear": "Nessun elemento completato da cancellare.",
        "notes.toastCreateFailed": "La nota attività non è ancora pronta."
    },
    "ja": {
        "notes.newBtn": "メモ",
        "notes.newTitle": "ToDoメモタブを作成",
        "notes.newMenu": "ToDoメモ",
        "notes.toolbarTitle": "ToDoメモ",
        "notes.toolbarHint": "チェック状態は自動保存されます",
        "notes.inputPlaceholder": "ToDoを入力...",
        "notes.addBtn": "追加",
        "notes.clearBtn": "完了を削除",
        "notes.clearTitle": "完了済みToDoを削除",
        "notes.fileBase": "Todoメモ",
        "notes.title": "ToDoメモ",
        "notes.kicker": "ToDoチェックリスト",
        "notes.subtitle": "タスクを書き、完了した項目をチェックして、このローカルHTMLメモに保存できます。",
        "notes.quickHint": "ヒント：プレビュー上部の入力欄から素早く追加できます。",
        "notes.initialOne": "最初のタスクをここに入力",
        "notes.initialTwo": "完了したらチェックボックスをクリック",
        "notes.initialThree": "上のツールバーからさらに追加",
        "notes.freeTitle": "メモ",
        "notes.freePlaceholder": "詳細をここに書いてください...",
        "notes.itemPlaceholder": "新しいToDo",
        "notes.toastCreated": "ToDoメモを作成しました。",
        "notes.toastAdded": "ToDoを追加しました。",
        "notes.toastNeedText": "先にToDoを入力してください。",
        "notes.toastCleared": "完了項目を削除しました。",
        "notes.toastNothingClear": "削除できる完了項目はありません。",
        "notes.toastCreateFailed": "ToDoメモはまだ準備できていません。"
    },
    "ko": {
        "notes.newBtn": "메모",
        "notes.newTitle": "할 일 메모 탭 만들기",
        "notes.newMenu": "할 일 메모",
        "notes.toolbarTitle": "할 일 메모",
        "notes.toolbarHint": "체크한 항목은 자동 저장됩니다",
        "notes.inputPlaceholder": "할 일을 입력하세요...",
        "notes.addBtn": "추가",
        "notes.clearBtn": "완료 삭제",
        "notes.clearTitle": "완료된 할 일 삭제",
        "notes.fileBase": "할일_메모",
        "notes.title": "할 일 메모",
        "notes.kicker": "할 일 체크리스트",
        "notes.subtitle": "할 일을 적고 완료 여부를 체크하며 이 로컬 HTML 메모에 저장하세요.",
        "notes.quickHint": "팁: 미리보기 위 입력창으로 빠르게 추가할 수 있습니다.",
        "notes.initialOne": "첫 번째 할 일을 여기에 입력하세요",
        "notes.initialTwo": "완료되면 체크박스를 클릭하세요",
        "notes.initialThree": "위 도구 모음에서 더 추가하세요",
        "notes.freeTitle": "메모",
        "notes.freePlaceholder": "추가 내용을 여기에 작성하세요...",
        "notes.itemPlaceholder": "새 할 일",
        "notes.toastCreated": "할 일 메모를 만들었습니다.",
        "notes.toastAdded": "할 일이 추가되었습니다.",
        "notes.toastNeedText": "먼저 할 일을 입력하세요.",
        "notes.toastCleared": "완료 항목을 삭제했습니다.",
        "notes.toastNothingClear": "삭제할 완료 항목이 없습니다.",
        "notes.toastCreateFailed": "할 일 메모가 아직 준비되지 않았습니다."
    },
    "nl": {
        "notes.newBtn": "Notities",
        "notes.newTitle": "Takennotitie",
        "notes.newMenu": "Takennotitie",
        "notes.toolbarTitle": "Takennotitie",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Voer een taak in...",
        "notes.addBtn": "Toevoegen",
        "notes.clearBtn": "Voltooide wissen",
        "notes.clearTitle": "Voltooide wissen",
        "notes.fileBase": "Takennotitie",
        "notes.title": "Takennotitie",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notities",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "no": {
        "notes.newBtn": "Notater",
        "notes.newTitle": "Gjøremålsnotat",
        "notes.newMenu": "Gjøremålsnotat",
        "notes.toolbarTitle": "Gjøremålsnotat",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Skriv inn en oppgave...",
        "notes.addBtn": "Legg til",
        "notes.clearBtn": "Fjern fullførte",
        "notes.clearTitle": "Fjern fullførte",
        "notes.fileBase": "Gjoeremaalsnotat",
        "notes.title": "Gjøremålsnotat",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notater",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "pl": {
        "notes.newBtn": "Notatki",
        "notes.newTitle": "Notatka zadań",
        "notes.newMenu": "Notatka zadań",
        "notes.toolbarTitle": "Notatka zadań",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Wpisz zadanie...",
        "notes.addBtn": "Dodaj",
        "notes.clearBtn": "Wyczyść wykonane",
        "notes.clearTitle": "Wyczyść wykonane",
        "notes.fileBase": "Notatka_Zadan",
        "notes.title": "Notatka zadań",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notatki",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "pt": {
        "notes.newBtn": "Notas",
        "notes.newTitle": "Criar aba de tarefas",
        "notes.newMenu": "Nota de tarefas",
        "notes.toolbarTitle": "Nota de tarefas",
        "notes.toolbarHint": "Itens marcados são salvos automaticamente",
        "notes.inputPlaceholder": "Digite uma tarefa...",
        "notes.addBtn": "Adicionar",
        "notes.clearBtn": "Limpar feitas",
        "notes.clearTitle": "Remover tarefas concluídas",
        "notes.fileBase": "Nota_Tarefas",
        "notes.title": "Nota de tarefas",
        "notes.kicker": "Lista de tarefas",
        "notes.subtitle": "Escreva tarefas, marque as concluídas e guarde tudo nesta nota HTML local.",
        "notes.quickHint": "Dica: use a barra acima da prévia para adicionar rapidamente.",
        "notes.initialOne": "Digite sua primeira tarefa aqui",
        "notes.initialTwo": "Clique na caixa quando terminar",
        "notes.initialThree": "Adicione mais pela barra superior",
        "notes.freeTitle": "Notas",
        "notes.freePlaceholder": "Escreva detalhes adicionais aqui...",
        "notes.itemPlaceholder": "Nova tarefa",
        "notes.toastCreated": "Nota de tarefas criada.",
        "notes.toastAdded": "Tarefa adicionada.",
        "notes.toastNeedText": "Digite uma tarefa primeiro.",
        "notes.toastCleared": "Itens concluídos removidos.",
        "notes.toastNothingClear": "Não há itens concluídos para limpar.",
        "notes.toastCreateFailed": "A nota de tarefas ainda não está pronta."
    },
    "ro": {
        "notes.newBtn": "Notițe",
        "notes.newTitle": "Notiță de sarcini",
        "notes.newMenu": "Notiță de sarcini",
        "notes.toolbarTitle": "Notiță de sarcini",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Introduceți o sarcină...",
        "notes.addBtn": "Adaugă",
        "notes.clearBtn": "Șterge finalizate",
        "notes.clearTitle": "Șterge finalizate",
        "notes.fileBase": "Notita_Sarcini",
        "notes.title": "Notiță de sarcini",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notițe",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "ru": {
        "notes.newBtn": "Заметки",
        "notes.newTitle": "Создать вкладку задач",
        "notes.newMenu": "Заметка задач",
        "notes.toolbarTitle": "Заметка задач",
        "notes.toolbarHint": "Отмеченные пункты сохраняются автоматически",
        "notes.inputPlaceholder": "Введите задачу...",
        "notes.addBtn": "Добавить",
        "notes.clearBtn": "Удалить готовые",
        "notes.clearTitle": "Удалить выполненные задачи",
        "notes.fileBase": "Заметка_задач",
        "notes.title": "Заметка задач",
        "notes.kicker": "Список задач",
        "notes.subtitle": "Записывайте задачи, отмечайте выполненные и храните всё в этой локальной HTML-заметке.",
        "notes.quickHint": "Совет: используйте строку над предпросмотром для быстрого добавления.",
        "notes.initialOne": "Введите первую задачу здесь",
        "notes.initialTwo": "Нажмите флажок, когда готово",
        "notes.initialThree": "Добавьте ещё через верхнюю панель",
        "notes.freeTitle": "Заметки",
        "notes.freePlaceholder": "Напишите дополнительные детали здесь...",
        "notes.itemPlaceholder": "Новая задача",
        "notes.toastCreated": "Заметка задач создана.",
        "notes.toastAdded": "Задача добавлена.",
        "notes.toastNeedText": "Сначала введите задачу.",
        "notes.toastCleared": "Выполненные пункты удалены.",
        "notes.toastNothingClear": "Нет выполненных пунктов для удаления.",
        "notes.toastCreateFailed": "Заметка задач ещё не готова."
    },
    "sv": {
        "notes.newBtn": "Anteckningar",
        "notes.newTitle": "Att-göra-anteckning",
        "notes.newMenu": "Att-göra-anteckning",
        "notes.toolbarTitle": "Att-göra-anteckning",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Skriv en uppgift...",
        "notes.addBtn": "Lägg till",
        "notes.clearBtn": "Rensa klara",
        "notes.clearTitle": "Rensa klara",
        "notes.fileBase": "Att_gora_anteckning",
        "notes.title": "Att-göra-anteckning",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Anteckningar",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "th": {
        "notes.newBtn": "โน้ต",
        "notes.newTitle": "โน้ตงานที่ต้องทำ",
        "notes.newMenu": "โน้ตงานที่ต้องทำ",
        "notes.toolbarTitle": "โน้ตงานที่ต้องทำ",
        "notes.toolbarHint": "รายการที่เลือกจะบันทึกอัตโนมัติ",
        "notes.inputPlaceholder": "พิมพ์งานที่ต้องทำ...",
        "notes.addBtn": "เพิ่ม",
        "notes.clearBtn": "ล้างที่เสร็จแล้ว",
        "notes.clearTitle": "ล้างที่เสร็จแล้ว",
        "notes.fileBase": "โน้ตงาน",
        "notes.title": "โน้ตงานที่ต้องทำ",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "โน้ต",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "tr": {
        "notes.newBtn": "Notlar",
        "notes.newTitle": "Görev notu",
        "notes.newMenu": "Görev notu",
        "notes.toolbarTitle": "Görev notu",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Görev yazın...",
        "notes.addBtn": "Ekle",
        "notes.clearBtn": "Tamamlananı temizle",
        "notes.clearTitle": "Tamamlananı temizle",
        "notes.fileBase": "Görev_Notu",
        "notes.title": "Görev notu",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Notlar",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "uk": {
        "notes.newBtn": "Нотатки",
        "notes.newTitle": "Нотатка завдань",
        "notes.newMenu": "Нотатка завдань",
        "notes.toolbarTitle": "Нотатка завдань",
        "notes.toolbarHint": "Checked items save automatically",
        "notes.inputPlaceholder": "Введіть завдання...",
        "notes.addBtn": "Додати",
        "notes.clearBtn": "Очистити виконані",
        "notes.clearTitle": "Очистити виконані",
        "notes.fileBase": "Нотатка_завдань",
        "notes.title": "Нотатка завдань",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Нотатки",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "vi": {
        "notes.newBtn": "Ghi chú",
        "notes.newTitle": "Ghi chú việc cần làm",
        "notes.newMenu": "Ghi chú việc cần làm",
        "notes.toolbarTitle": "Ghi chú việc cần làm",
        "notes.toolbarHint": "Mục đã đánh dấu sẽ tự lưu",
        "notes.inputPlaceholder": "Nhập việc cần làm...",
        "notes.addBtn": "Thêm",
        "notes.clearBtn": "Xóa đã xong",
        "notes.clearTitle": "Xóa đã xong",
        "notes.fileBase": "Ghi_Chu_Viec",
        "notes.title": "Ghi chú việc cần làm",
        "notes.kicker": "Todo Checklist",
        "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
        "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
        "notes.initialOne": "Type your first task here",
        "notes.initialTwo": "Click the checkbox when it is done",
        "notes.initialThree": "Add more items from the toolbar above",
        "notes.freeTitle": "Ghi chú",
        "notes.freePlaceholder": "Write additional details here...",
        "notes.itemPlaceholder": "New todo item",
        "notes.toastCreated": "Todo note created.",
        "notes.toastAdded": "Todo item added.",
        "notes.toastNeedText": "Please enter a todo item first.",
        "notes.toastCleared": "Completed items removed.",
        "notes.toastNothingClear": "No completed items to clear.",
        "notes.toastCreateFailed": "Todo note is not ready yet."
    },
    "zh-CN": {
        "notes.newBtn": "记事",
        "notes.newTitle": "建立待办记事页签",
        "notes.newMenu": "待办记事",
        "notes.toolbarTitle": "待办记事",
        "notes.toolbarHint": "勾选完成会自动保存",
        "notes.inputPlaceholder": "输入待办事项...",
        "notes.addBtn": "新增",
        "notes.clearBtn": "清除完成",
        "notes.clearTitle": "移除已完成的待办事项",
        "notes.fileBase": "待办记事",
        "notes.title": "待办记事",
        "notes.kicker": "待办清单",
        "notes.subtitle": "输入待办事项、勾选完成状态，所有内容都会保存在这个本地 HTML 记事中。",
        "notes.quickHint": "提示：可用预览上方的输入栏快速新增待办。",
        "notes.initialOne": "在这里输入第一个待办事项",
        "notes.initialTwo": "完成后点击左侧复选框",
        "notes.initialThree": "可从上方工具栏继续新增事项",
        "notes.freeTitle": "补充笔记",
        "notes.freePlaceholder": "在这里补充细节...",
        "notes.itemPlaceholder": "新的待办事项",
        "notes.toastCreated": "已建立待办记事。",
        "notes.toastAdded": "已新增待办事项。",
        "notes.toastNeedText": "请先输入待办事项。",
        "notes.toastCleared": "已移除完成事项。",
        "notes.toastNothingClear": "目前没有已完成事项可清除。",
        "notes.toastCreateFailed": "待办记事功能尚未准备好。"
    },
    "zh-TW": {
        "notes.newBtn": "記事",
        "notes.newTitle": "建立待辦記事頁籤",
        "notes.newMenu": "待辦記事",
        "notes.toolbarTitle": "待辦記事",
        "notes.toolbarHint": "勾選完成會自動儲存",
        "notes.inputPlaceholder": "輸入待辦事項...",
        "notes.addBtn": "新增",
        "notes.clearBtn": "清除完成",
        "notes.clearTitle": "移除已完成的待辦事項",
        "notes.fileBase": "待辦記事",
        "notes.title": "待辦記事",
        "notes.kicker": "待辦清單",
        "notes.subtitle": "輸入待辦事項、勾選完成狀態，所有內容都會存在這個本機 HTML 記事。",
        "notes.quickHint": "小提示：可用預覽上方的輸入列快速新增待辦。",
        "notes.initialOne": "在這裡輸入第一個待辦事項",
        "notes.initialTwo": "完成後點選左側核取方塊",
        "notes.initialThree": "可從上方工具列繼續新增事項",
        "notes.freeTitle": "補充筆記",
        "notes.freePlaceholder": "在這裡補充細節...",
        "notes.itemPlaceholder": "新的待辦事項",
        "notes.toastCreated": "已建立待辦記事。",
        "notes.toastAdded": "已新增待辦事項。",
        "notes.toastNeedText": "請先輸入待辦事項。",
        "notes.toastCleared": "已移除完成事項。",
        "notes.toastNothingClear": "目前沒有已完成事項可清除。",
        "notes.toastCreateFailed": "待辦記事功能尚未準備好。"
    }
};

    function tr(key, fallback) {
        if (typeof window.t === 'function') {
            const value = window.t(key);
            if (value && value !== key) return value;
        }
        const lang = getLang();
        const shortLang = String(lang || '').split('-')[0];
        const local = NOTE_I18N[lang] || NOTE_I18N[shortLang] || NOTE_I18N.en || {};
        return local[key] || (NOTE_I18N.en && NOTE_I18N.en[key]) || fallback || key;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function timestamp() {
        const d = new Date();
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function getLang() {
        const raw = (window.i18next && window.i18next.language) || localStorage.getItem('webpad_lang') || navigator.language || 'en';
        if (/^zh/i.test(raw)) return raw.includes('CN') || raw.includes('Hans') ? 'zh-CN' : 'zh-TW';
        return raw.split('-')[0] || 'en';
    }

    function getTextBundle() {
        return {
            title: tr('notes.title', 'Todo Note'),
            subtitle: tr('notes.subtitle', 'Write tasks, tick completed items, and keep everything in this local HTML note.'),
            quickHint: tr('notes.quickHint', 'Tip: Use the input bar above the preview to add new tasks quickly.'),
            initialOne: tr('notes.initialOne', 'Type your first task here'),
            initialTwo: tr('notes.initialTwo', 'Click the checkbox when it is done'),
            initialThree: tr('notes.initialThree', 'Add more items from the toolbar above'),
            freeTitle: tr('notes.freeTitle', 'Notes'),
            freePlaceholder: tr('notes.freePlaceholder', 'Write additional details here...')
        };
    }

    function createTemplate() {
        const text = getTextBundle();
        const lang = getLang();
        return `<section class="todo-note" data-webpad-note="true" lang="${escapeHtml(lang)}">
    <header class="todo-note-header">
        <p class="todo-note-kicker">${escapeHtml(tr('notes.kicker', 'Todo Checklist'))}</p>
        <h1>${escapeHtml(text.title)}</h1>
        <p class="todo-note-subtitle">${escapeHtml(text.subtitle)}</p>
        <p class="todo-note-hint">${escapeHtml(text.quickHint)}</p>
    </header>
    <ul class="todo-list" data-note-list="true">
        <li class="todo-item" data-done="false"><label><input type="checkbox" data-note-check="true"> <span data-note-text="true">${escapeHtml(text.initialOne)}</span></label></li>
        <li class="todo-item" data-done="false"><label><input type="checkbox" data-note-check="true"> <span data-note-text="true">${escapeHtml(text.initialTwo)}</span></label></li>
        <li class="todo-item" data-done="false"><label><input type="checkbox" data-note-check="true"> <span data-note-text="true">${escapeHtml(text.initialThree)}</span></label></li>
    </ul>
    <section class="todo-note-freeform">
        <h2>${escapeHtml(text.freeTitle)}</h2>
        <p>${escapeHtml(text.freePlaceholder)}</p>
    </section>
</section>`;
    }

    function isNoteTab(tab) {
        if (!tab) return false;
        return tab.docType === 'note' || tab.isTodoNote || /data-webpad-note\s*=\s*["']true["']/i.test(tab.content || '');
    }

    function updateToolbarLocale() {
        const input = document.getElementById('note-new-item-input');
        if (input) input.placeholder = tr('notes.inputPlaceholder', 'Enter a todo item...');
        document.querySelectorAll('[data-i18n^="notes."]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) el.innerHTML = tr(key, el.innerHTML || key);
        });
        document.querySelectorAll('[data-i18n-title^="notes."]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key) el.title = tr(key, el.title || key);
        });
        document.querySelectorAll('[data-i18n-placeholder^="notes."]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = tr(key, el.placeholder || key);
        });
    }

    function updateToolbarVisibility() {
        const toolbar = document.getElementById('note-toolbar');
        if (!toolbar) return;
        const tab = window.tabManager && window.tabManager.getActiveTab ? window.tabManager.getActiveTab() : null;
        const shouldShow = isNoteTab(tab) && tab && (tab.mode === 'visual' || tab.mode === 'split');
        toolbar.classList.toggle('hidden', !shouldShow);
        toolbar.classList.toggle('flex', !!shouldShow);
        updateToolbarLocale();
    }

    function markTabAsNote(tab) {
        if (!tab) return;
        tab.docType = 'note';
        tab.isTodoNote = true;
        tab.mode = 'visual';
    }

    function create() {
        const menu = document.getElementById('new-file-menu');
        if (menu) menu.classList.add('hidden');

        const baseName = tr('notes.fileBase', 'Todo_Note').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Todo_Note';
        const fileName = `${baseName}_${timestamp()}.html`;
        const content = createTemplate();

        if (!window.tabManager || typeof window.tabManager.createNewTab !== 'function') {
            if (typeof window.showToast === 'function') window.showToast(tr('notes.toastCreateFailed', 'Todo note is not ready yet.'), 'error');
            return;
        }

        const tab = window.tabManager.createNewTab(fileName, content, false);
        const active = tab || window.tabManager.getActiveTab();
        markTabAsNote(active);

        if (active && active.fsId && window.fileSystem && typeof window.fileSystem.getNode === 'function') {
            const node = window.fileSystem.getNode(active.fsId);
            if (node) {
                node.content = content;
                node.docType = 'note';
                node.updatedAt = Date.now();
                window.fileSystem.save();
                window.fileSystem.renderTree();
            }
        }

        if (typeof window.switchToVisual === 'function') window.switchToVisual();
        updateToolbarVisibility();
        if (window.tabManager && typeof window.tabManager.saveTabs === 'function') window.tabManager.saveTabs();
        if (typeof window.showToast === 'function') window.showToast(tr('notes.toastCreated', 'Todo note created.'), 'success');
    }

    function getFrameDocument() {
        const frame = document.getElementById('visual-frame');
        if (!frame) return null;
        try { return frame.contentDocument || frame.contentWindow.document; } catch (e) { return null; }
    }

    function ensureNoteRoot(doc) {
        if (!doc || !doc.body) return null;
        let root = doc.body.querySelector('[data-webpad-note="true"]');
        if (!root) {
            doc.body.insertAdjacentHTML('afterbegin', createTemplate());
            root = doc.body.querySelector('[data-webpad-note="true"]');
        }
        return root;
    }

    function makeTodoHtml(text, checked) {
        const done = checked ? 'true' : 'false';
        const checkedAttr = checked ? ' checked="checked"' : '';
        return `<li class="todo-item${checked ? ' is-done' : ''}" data-done="${done}"><label><input type="checkbox" data-note-check="true"${checkedAttr}> <span data-note-text="true">${escapeHtml(text)}</span></label></li>`;
    }

    function syncCheckboxElement(input) {
        if (!input || input.type !== 'checkbox') return;
        const item = input.closest('.todo-item');
        if (input.checked) {
            input.setAttribute('checked', 'checked');
            if (item) {
                item.setAttribute('data-done', 'true');
                item.classList.add('is-done');
            }
        } else {
            input.removeAttribute('checked');
            if (item) {
                item.setAttribute('data-done', 'false');
                item.classList.remove('is-done');
            }
        }
    }

    function syncAllCheckboxes(doc) {
        if (!doc) return;
        doc.querySelectorAll('[data-note-check="true"], .todo-note input[type="checkbox"]').forEach(syncCheckboxElement);
    }

    function addTodo(text, options = {}) {
        const doc = options.doc || getFrameDocument();
        const value = String(text || '').trim();
        if (!value) {
            if (typeof window.showToast === 'function') window.showToast(tr('notes.toastNeedText', 'Please enter a todo item first.'), 'info');
            return false;
        }
        const root = ensureNoteRoot(doc);
        const list = root && root.querySelector('[data-note-list="true"], .todo-list');
        if (!list) return false;
        list.insertAdjacentHTML('beforeend', makeTodoHtml(value, false));
        const last = list.lastElementChild;
        const textEl = last && last.querySelector('[data-note-text="true"]');
        if (textEl && doc.defaultView) {
            try {
                const range = doc.createRange();
                range.selectNodeContents(textEl);
                range.collapse(false);
                const sel = doc.defaultView.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
                textEl.focus && textEl.focus();
            } catch (e) {}
        }
        if (typeof window.syncVisualToCode === 'function') window.syncVisualToCode();
        if (typeof window.showToast === 'function') window.showToast(tr('notes.toastAdded', 'Todo item added.'), 'success');
        return true;
    }

    function addTodoAfterItem(item) {
        const doc = item && item.ownerDocument;
        if (!doc) return;
        item.insertAdjacentHTML('afterend', makeTodoHtml(tr('notes.itemPlaceholder', 'New todo item'), false));
        const next = item.nextElementSibling;
        const textEl = next && next.querySelector('[data-note-text="true"]');
        if (textEl && doc.defaultView) {
            const range = doc.createRange();
            range.selectNodeContents(textEl);
            const sel = doc.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        if (typeof window.syncVisualToCode === 'function') window.syncVisualToCode();
    }

    function addTodoFromInput() {
        const input = document.getElementById('note-new-item-input');
        const value = input ? input.value : '';
        if (addTodo(value) && input) {
            input.value = '';
            input.focus();
        }
    }

    function clearCompleted() {
        const doc = getFrameDocument();
        if (!doc) return;
        syncAllCheckboxes(doc);
        const completed = Array.from(doc.querySelectorAll('.todo-item')).filter(item => {
            const input = item.querySelector('input[type="checkbox"]');
            return item.getAttribute('data-done') === 'true' || (input && input.checked);
        });
        completed.forEach(item => item.remove());
        if (typeof window.syncVisualToCode === 'function') window.syncVisualToCode();
        if (typeof window.showToast === 'function') {
            const msg = completed.length ? tr('notes.toastCleared', 'Completed items removed.') : tr('notes.toastNothingClear', 'No completed items to clear.');
            window.showToast(msg, completed.length ? 'success' : 'info');
        }
    }

    function bindFrame(doc) {
        if (!doc || !doc.body) return;
        if (doc.__webpadNotesChangeHandler) doc.body.removeEventListener('change', doc.__webpadNotesChangeHandler);
        doc.__webpadNotesChangeHandler = (event) => {
            const target = event.target;
            if (!target || !target.matches || !target.matches('[data-note-check="true"], .todo-note input[type="checkbox"]')) return;
            syncCheckboxElement(target);
            if (typeof window.syncVisualToCode === 'function') window.syncVisualToCode();
        };
        doc.body.addEventListener('change', doc.__webpadNotesChangeHandler);

        if (doc.__webpadNotesKeyHandler) doc.body.removeEventListener('keydown', doc.__webpadNotesKeyHandler);
        doc.__webpadNotesKeyHandler = (event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            const target = event.target;
            const textEl = target && target.closest && target.closest('[data-note-text="true"]');
            const item = textEl && textEl.closest('.todo-item');
            if (!item) return;
            event.preventDefault();
            addTodoAfterItem(item);
        };
        doc.body.addEventListener('keydown', doc.__webpadNotesKeyHandler);

        syncAllCheckboxes(doc);
    }

    const api = {
        create,
        createTemplate,
        addTodo,
        addTodoFromInput,
        clearCompleted,
        bindFrame,
        isNoteTab,
        syncAllCheckboxes,
        updateToolbarVisibility,
        updateToolbarLocale,
    };

    window.createTodoNote = create;
    window.addTodoFromInput = addTodoFromInput;
    window.clearCompletedTodos = clearCompleted;

    if (window.WebcodingApp && window.WebcodingApp.namespace) {
        window.WebcodingApp.namespace.expose('features.notes', api, { legacyName: 'notesFeature' });
    } else {
        window.notesFeature = api;
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateToolbarLocale();
        const input = document.getElementById('note-new-item-input');
        if (input) {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addTodoFromInput();
                }
            });
        }
        updateToolbarVisibility();
    });
})();

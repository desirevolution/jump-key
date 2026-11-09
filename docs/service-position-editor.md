# Service-Position im Editor (Folgeänderung)

Die ursprüngliche Positionsauswahl ist im gemeinsamen Service-Editor wiederhergestellt.
Direkt unter **Kategorie** sind die Positionen **Ganz oben**, **Nach „[Service]“**
und **Ganz unten** verfügbar. Beim Anlegen wird **Ganz unten** vorgeschlagen.

Beim Bearbeiten ist zunächst die vorhandene Position ausgewählt; der aktuell
bearbeitete Service steht nicht als Ziel von „Nach …“ zur Auswahl. Wird eine
andere oder neu erstellte Kategorie ausgewählt, wird **Ganz unten** vorgeschlagen.
Bei Rückkehr zur ursprünglichen Kategorie wird die ursprüngliche Position
wieder ausgewählt. In einer leeren Kategorie gibt es nur Anfang und Ende.

Die Position wird zusammen mit Name, URL, Icon, Kategorie und Shortcut über
die bestehende ETag-gesicherte Workspace-Konfiguration gespeichert. IDs,
Favoriten und Verlauf bleiben erhalten; es gibt keine Verschiebung in andere
Workspaces und kein Drag & Drop zwischen Spalten.

## Abnahme

1. Vorhandenen Service in mittlerer/letzter Position öffnen: die bestehende
   Position ist vorausgewählt und Speichern ohne Änderungen deaktiviert.
2. „Ganz oben“, „Nach …“ und „Ganz unten“ innerhalb einer Kategorie speichern
   und Reihenfolge nach Reload prüfen.
3. Kategorie wechseln, eine konkrete Position wählen, speichern: Service-ID
   bleibt erhalten und der Service landet genau an dieser Stelle.
4. Andere Kategorie wählen, dann zur ursprünglichen zurückwechseln: die
   ursprüngliche Position ist wieder ausgewählt.
5. Neuen Service in leerer, vorhandener und neuer Kategorie erstellen;
   Validierungsfehler und ETag-Konflikte ohne Datenverlust behandeln.
6. Verifizieren, dass der Drag-&-Drop-Sortierentwurf in der Verwaltung weiterhin
   unabhängig funktioniert und nicht automatisch gespeichert wird.

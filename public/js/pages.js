(function () {
  const FT = window.FT;

  FT.PAGES = {
    about: {
      title: 'About Us',
      html: `<p>Family Tree Builder is a free, browser-based tool for recording and visualising your family history. Add relatives, birth and death dates, cities, professions, photos and life stories, and the tree arranges itself automatically.</p>
<p>Your tree is stored on your own device. Nothing is uploaded to a server, so your family's details stay private. Use the export options to save a picture, a spreadsheet, or a file you can reopen later.</p>`
    },
    faq: {
      title: 'FAQ',
      html: `<h2>How do I add relatives?</h2><p>Select a person on the tree, then use <em>Add parents</em>, <em>Add sibling</em>, <em>Add partner</em> or <em>Add child</em> in the person panel.</p>
<h2>How do I edit details or add a photo?</h2><p>Select a person and press <em>Edit person</em>. You can change names, dates, residential city, profession, interesting facts and upload a picture.</p>
<h2>Can I move the cards myself?</h2><p>Yes. Turn on <em>Manual layout</em> in the toolbar and drag any card. Turn it off to return to the automatic arrangement.</p>
<h2>How do I export my tree?</h2><p>Use <em>Export</em> to download a PNG, JPEG or SVG picture, or an Excel spreadsheet of everyone in your tree.</p>
<h2>Where is my data stored?</h2><p>In your browser's local storage on this device, and on the sync server when it is running. Use <em>Export → Tree file</em> (or <em>Save tree to file</em> in the menu) to keep a backup or move a tree to another device, and <em>Import tree from file</em> to add it there as a new tree. Signing in is optional: with an account, your trees are saved privately to it and follow you to every browser you sign in on. Use <em>Share</em> in the toolbar to get a view-only link: anyone who opens it can look at that one tree but cannot change it, and you can stop sharing at any time.</p>
<h2>Can I undo a mistake?</h2><p>Yes, the toolbar has undo and redo buttons.</p>`
    },
    contact: {
      title: 'Contact',
      html: `<p>Questions, ideas or bug reports? We'd love to hear from you.</p>
<form id="contactForm" class="contact-form">
  <label>Your email<input type="email" name="email" required></label>
  <label>Message<textarea name="message" rows="5" required></textarea></label>
  <button class="btn primary" type="submit">Send message</button>
</form>
<p class="muted">This demo has no server, so sending opens your email app.</p>`
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      html: `<p>Family Tree Builder keeps your family tree in your browser's local storage. We do not collect, transmit or sell the information you enter, including names, dates and photos.</p>
<p>Clearing your browser data removes the tree, so use the <em>Save tree to file</em> option to keep a backup.</p>`
    },
    'terms-and-conditions': {
      title: 'Terms & Conditions',
      html: `<p>This tool is provided as is, without warranty of any kind. You are responsible for the accuracy of the information you enter and for keeping backups of your tree.</p>
<p>Please respect the privacy of living relatives when sharing exported trees.</p>`
    }
  };
})();

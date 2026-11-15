---
title: "Contact"
description: "Have questions or suggestions? Reach the Travel Style Hub editorial desk at contact@travelstylehub.com or use the contact form."
---

<p>Have questions or suggestions? The fastest way to reach the Travel Style Hub editorial desk is by email. We read every message and answer within five working days.</p>

<p><a class="contact-mail" href="mailto:contact@travelstylehub.com">contact@travelstylehub.com</a></p>

<h2>Send us a message</h2>

<p>Fill in the form below and your email application will open with the message ready to send.</p>

<form class="contact-form" id="tsh-contact-form">
  <p>
    <label for="tsh-name">Your name</label>
    <input id="tsh-name" name="name" type="text" autocomplete="name" required />
  </p>
  <p>
    <label for="tsh-email">Your email</label>
    <input id="tsh-email" name="email" type="email" autocomplete="email" required />
  </p>
  <p>
    <label for="tsh-subject">Subject</label>
    <input id="tsh-subject" name="subject" type="text" />
  </p>
  <p>
    <label for="tsh-message">Your message</label>
    <textarea id="tsh-message" name="message" rows="8"></textarea>
  </p>
  <p><button type="submit" class="contact-submit">Open in my email app</button></p>
</form>

<script>
  var form = document.getElementById("tsh-contact-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var subject = String(data.get("subject") || "").trim() || "Message from travelstylehub.com";
      var body = [
        "Name: " + (data.get("name") || ""),
        "Email: " + (data.get("email") || ""),
        "",
        String(data.get("message") || "")
      ].join("\n");
      window.location.href =
        "mailto:contact@travelstylehub.com?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    });
  }
</script>

<h2>Postal address</h2>

<p>
  Patrick D Culver &mdash; Travel Style Hub<br />
  3095 Dundas St W<br />
  Toronto, ON M6P 1Z9<br />
  Canada
</p>

<p>You can also reach us on +1 416-549-7510.</p>

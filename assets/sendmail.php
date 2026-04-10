

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Send to your personal email
    $to = "shereen_akoum@hotmail.com";  
    $subject = "New Booking Request";

    // Collect form data
    $name = htmlspecialchars($_POST['name']);
    $phone = htmlspecialchars($_POST['phone']);

    // Build the email body
    $body = "You have a new booking request:\n\n";
    $body .= "Name: $name\n";
    $body .= "Phone: $phone\n";

    // Use your Hotmail as the From and Reply-To
    $headers = "From: shereen_akoum@hotmail.com\r\n";
    $headers .= "Reply-To: shereen_akoum@hotmail.com\r\n";

    // Send the email
    if (mail($to, $subject, $body, $headers)) {
        echo "Thank you! Your booking request has been sent.";
    } else {
        echo "Sorry, there was a problem sending your request.";
    }
}
?>
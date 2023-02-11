import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const contactForm = (req, res) => {
  const { email, name, message } = req.body;
  const emailData = {
    to: process.env.EMAIL_TO,
    from: email,
    subject: `This Is A Message From - ${process.env.APP_NAME}`,
    text: `You've Got A Message From: ${name} \n Sender Email: ${email} \n Sender's Email: ${message}`,
    html: `
      <h4>Email Received From Contact Form</h4>
      <p>Sender's Name: ${name}</p>
      <p>Sender's Email: ${email}</p>
      <p>Sender's Message: ${message}</p>
      <hr/>
      <p>This Email Contains Sensible Informations</p>
      <p>https://techflu.com</p>
    `,
  };

  sgMail.send(emailData).then(sent => {
    return res.json({
      success: true,
    });
  });
};

const contactBlogAuthorForm = (req, res) => {
  const { authorEmail, email, name, message } = req.body;

  let maillist = [authorEmail, process.env.EMAIL_TO];

  const emailData = {
    to: maillist,
    from: email,
    subject: `This Is A Message From - ${process.env.APP_NAME}`,
    text: `You've Got A Message From: ${name} \n Sender Email : ${email} \n Sender's Email : {message}`,
    html: `
      <h4>Email Received From Contact Form</h4>
      <p>Sender's Name :${name}</p>
      <p>Sender's Email :${email}</p>
      <p>Sender's Message :${message}</p>
      <hr/>
      <p>This Email Contains Sensible Informations</p>
      <p>https://techflu.com</p>
    `,
  };

  sgMail.send(emailData).then(sent => {
    return res.json({
      success: true,
    });
  });
};

export { contactForm, contactBlogAuthorForm }
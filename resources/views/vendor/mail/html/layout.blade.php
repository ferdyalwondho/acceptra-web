<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{{ config('app.name', 'Acceptra') }}</title>
<style>
  body { margin: 0; padding: 0; background-color: #F9FAFB; font-family: Arial, Helvetica, sans-serif; }
  table { border-collapse: collapse; }
  img { border: 0; display: block; }
  a { color: #325F7D; text-decoration: none; }
  a:hover { text-decoration: underline; }
  @media only screen and (max-width: 620px) {
    .email-wrapper { width: 100% !important; }
    .email-body { padding: 0 16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F9FAFB;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table class="email-wrapper" width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="width:600px;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">

        {{-- Header --}}
        @include('vendor.mail.html.header')

        {{-- Body --}}
        <tr>
          <td class="email-body" style="padding:32px;">
            {!! Illuminate\Mail\Markdown::parse($slot) !!}
          </td>
        </tr>

        {{-- Footer --}}
        @include('vendor.mail.html.footer')

      </table>

    </td>
  </tr>
</table>

</body>
</html>

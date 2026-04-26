<?php

return [

    /*
    | Allow `/admin/register` to create new admin users. Disable in production
    | or protect with additional policies as needed.
    */
    'allow_registration' => env('ADMIN_ALLOW_REGISTRATION', false),

];

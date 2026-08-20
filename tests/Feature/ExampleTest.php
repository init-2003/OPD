<?php

it('redirects root path to login page', function () {
    $response = $this->get('/');

    $response->assertRedirect('/login');
});


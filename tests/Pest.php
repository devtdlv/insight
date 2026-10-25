<?php

use Tests\TestCase;

require_once __DIR__.'/Support/Tenancy.php';

uses(TestCase::class)
    ->beforeEach(function () {
        $this->withoutVite();
    })
    ->in('Feature');

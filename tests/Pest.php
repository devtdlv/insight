<?php

use Tests\TestCase;

uses(TestCase::class)
    ->beforeEach(function () {
        $this->withoutVite();
    })
    ->in('Feature');

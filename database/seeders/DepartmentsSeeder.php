<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Departments;

class DepartmentsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1
        Departments::create([
            'name' => 'Office of the President',
            'code' => 'OP',
            'description' => 'Office of the President',
            'type' => 'office',
            'is_presidential' => true,
        ]);

        // 2
        Departments::create([
            'name' => 'Office of the Vice President',
            'code' => 'OVP',
            'description' => 'Office of the Vice President',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        // 3
        Departments::create([
            'name' => 'Office of the Vice President for Research and Development',
            'code' => 'OVP-R&D',
            'description' => 'Office of the Vice President for Research and Development',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        // 4
        Departments::create([
            'name' => 'Office of the Vice President for Academic Affairs',
            'code' => 'OVP-AA',
            'description' => 'Office of the Vice President for Academic Affairs',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        // 5
        Departments::create([
            'name' => 'Office of the Vice President for Finance',
            'code' => 'OVP-Finance',
            'description' => 'Office of the Vice President for Finance',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        // 6
        Departments::create([
            'name' => 'College of Computing Studies',
            'code' => 'CCS',
            'description' => 'College of Computing Studies',
            'type' => 'college',
            'is_presidential' => false,
        ]);

        Departments::create([
            'name' => 'University Student Council',
            'code' => 'USC',
            'description' => 'University Student Council',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        Departments::create([
            'name' => 'Office of Student Affairs',
            'code' => 'OSA',
            'description' => 'Office of Student Affairs',
            'type' => 'office',
            'is_presidential' => false,
        ]);

        Departments::create([
            'name' => 'Office of the Legal Office',
            'code' => 'OLO',
            'description' => 'Office of the Legal Office',
            'type' => 'office',
            'is_presidential' => false,
    ]);

    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Superadmin
        User::factory()->create([
            'first_name' => 'Superadmin',
            'last_name' => 'User',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'role' => 'superadmin',
            'department_id' => null,
            'position' => 'Superadmin',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        // OP
        User::factory()->create([
            'first_name' => 'President',
            'last_name' => 'User',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'University President',
            'department_id' => 1,
            'role' => 'admin',
            'email' => 'wmsu_pres@gmail.com',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Berhana',
            'last_name' => 'Flores',
            'middle_name' => 'Ignacio',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Chief of Staff',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'berhana.flores@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Aldrin',
            'last_name' => 'Valerio',
            'middle_name' => 'Sebastian',
            'suffix' => '',
            'gender' => 'Male',
            'position' => 'EA/Associate Professor IV',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'valerio.aldrin@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Darlyn',
            'last_name' => 'Flores',
            'middle_name' => 'Perez',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Special Assistant to the President',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'darlyn.flores@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Shamir',
            'last_name' => 'Kassim',
            'middle_name' => 'Reyes',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'EASAC-UCC',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'kassim.shamir@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Trinity Jade',
            'last_name' => 'Atilano',
            'middle_name' => 'Lledo',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Admin Officer 3',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'atilano.trinityjade@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Jhema Lyne',
            'last_name' => 'Jukuy',
            'middle_name' => 'Sahi',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Admin Officer 1',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'jhemasahi@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Aimee',
            'last_name' => 'Gabuni',
            'middle_name' => 'Encarnado',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Admin Aide 5',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'aimeeencarnado18@gmail.com',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Jose Raul',
            'last_name' => 'Adasa',
            'middle_name' => 'B.',
            'suffix' => '',
            'gender' => 'Male',
            'position' => 'Admin Aide 4',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'donjoseadasa@gmail.com',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create([
            'first_name' => 'Jennifer',
            'last_name' => 'Sumaga',
            'middle_name' => 'L.',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Admin Aide 3',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'xt202004188@wmsu.edu.ph',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create(attributes: [
            'first_name' => 'Ariel',
            'last_name' => 'Dumagal',
            'middle_name' => '',
            'suffix' => '',
            'gender' => 'Male',
            'position' => 'Admin Aide 3',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'ariel.dumagal@gmail.com',
            'password' => Hash::make('password'),
        ]);


        User::factory()->create(attributes: [
            'first_name' => 'Stephen Lloyd',
            'last_name' => 'Agno',
            'middle_name' => 'Lim',
            'suffix' => '',
            'gender' => 'Male',
            'position' => 'Admin Aide 3',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'stephenlloydagno@gmail.com',
            'password' => Hash::make('password'),
        ]);

        User::factory()->create(attributes: [
            'first_name' => 'Catherine',
            'last_name' => 'Gutierez',
            'middle_name' => 'Diongson',
            'suffix' => '',
            'gender' => 'Female',
            'position' => 'Admin Aide 1',
            'department_id' => 1,
            'role' => 'user',
            'email' => 'catherinegutierez083@gmail.com',
            'password' => Hash::make('password'),
        ]);

        // ------------------------------------------------------------------------ //

        // OVP
        User::factory()->create([
            'first_name' => 'President',
            'last_name' => 'Vice',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'University Vice President',
            'department_id' => 2,
            'role' => 'admin',
            'email' => 'wmsu_ovp@gmail.com',
            'password' => Hash::make('password'),
        ]);

        // OVP-R&D
        User::factory()->create([
            'first_name' => 'Vice',
            'last_name' => 'President for Research and Development',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Female',
            'position' => 'University Vice President for Research and Development',
            'department_id' => 3,
            'role' => 'admin',
            'email' => 'ovp_rd@gmail.coom',
            'password' => Hash::make('password'),
        ]);

        // OVP-AA
        User::factory()->create([
            'first_name' => 'Vice',
            'last_name' => 'President for Academic Affairs',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Female',
            'position' => 'University Vice President for Academic Affairs',
            'department_id' => 4,
            'role' => 'admin',
            'email' => 'ovpaa@gmail.com',
            'password' => Hash::make('password'),
        ]);

        // OVP-Administration and Finance
        User::factory()->create([
            'first_name' => 'Vice',
            'last_name' => 'President for Finance',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'University Vice President for Finance',
            'department_id' => 5,
            'role' => 'admin',
            'email' => 'wmsu_finance@gmail.com',
            'password' => Hash::make('password'),
        ]);

        // CCS
        User::factory()->create([
            'first_name' => 'Dean',
            'last_name' => 'User',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'Dean',
            'department_id' => 6,
            'role' => 'admin',
            'email' => 'wmsu_ccs@gmail.com',
            'password' => Hash::make('password'),
        ]);

            // UNIV STUDENT COUNCIL
        User::factory()->create([
            'first_name' => 'Student',
            'last_name' => 'Regent',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'President',
            'department_id' => 7,
            'role' => 'admin',
            'email' => 'wmsu_usc@gmail.com',
            'password' => Hash::make('password'),
        ]);


                // OSA
        User::factory()->create([
            'first_name' => 'Student',
            'last_name' => 'Affairs',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'VP for Student Affairs',
            'department_id' => 8,
            'role' => 'admin',
            'email' => 'wmsu_osa@gmail.com',
            'password' => Hash::make('password'),
        ]);

            // Legal Office
        User::factory()->create([
            'first_name' => 'Legal',
            'last_name' => 'Office',
            'middle_name' => '',
            'suffix' => 'Suffix',
            'gender' => 'Male',
            'position' => 'Head',
            'department_id' => 8,
            'role' => 'admin',
            'email' => 'wmsu_legaloffice@gmail.com',
            'password' => Hash::make('password'),
        ]);
    }


}


//President: Dr. Ma. Carla A. Ochotorena

//Vice Presidents:
//Dr. Nursia M. Barjose (Academic Affairs)
//Dr. Joel G. Fernando (Research, Extension & External Linkages)
//Dr. Joselito D. Madroñal (Administration & Finance)
//Dr. Fredelino M. San Juan (Resource Generation, UPRESS, Bids & Awards)

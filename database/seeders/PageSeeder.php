<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        $pages = [
            [
                'title' => 'About Us',
                'slug' => 'about-us',
                'content' => '<h1>About Kharidai</h1><p>Welcome to Kharidai.com! We are a leading e-commerce platform based in Nepal, offering a wide range of physical, digital, and service products to meet all your needs. Our mission is to provide an unparalleled shopping experience with top-notch customer service, fast delivery, and competitive pricing.</p><p>Founded in 2026, Kharidai has grown from a small startup to a trusted marketplace connecting buyers and sellers across the region.</p>',
                'seo_title' => 'About Kharidai | Nepal\'s Premium E-commerce',
                'seo_description' => 'Learn more about Kharidai, our mission, and our commitment to providing the best online shopping experience in Nepal.',
                'is_published' => true,
                'show_in_nav' => true,
                'show_in_footer' => true,
                'sort_order' => 1,
            ],
            [
                'title' => 'Privacy Policy',
                'slug' => 'privacy-policy',
                'content' => '<h1>Privacy Policy</h1><p>At Kharidai, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information.</p><h2>Information Collection</h2><p>We collect information when you register on our site, place an order, or subscribe to our newsletter. This includes your name, email address, mailing address, and phone number.</p><h2>Use of Information</h2><p>The information we collect is used to personalize your experience, improve our website, and process transactions securely.</p>',
                'seo_title' => 'Privacy Policy | Kharidai',
                'seo_description' => 'Read our privacy policy to understand how Kharidai collects, uses, and protects your personal data.',
                'is_published' => true,
                'show_in_nav' => false,
                'show_in_footer' => true,
                'sort_order' => 2,
            ],
            [
                'title' => 'Terms of Service',
                'slug' => 'terms-of-service',
                'content' => '<h1>Terms of Service</h1><p>By accessing or using Kharidai.com, you agree to be bound by these Terms of Service.</p><h2>Account Responsibilities</h2><p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p><h2>Product Descriptions</h2><p>We strive for accuracy, but we do not warrant that product descriptions or other content is completely error-free.</p>',
                'seo_title' => 'Terms of Service | Kharidai',
                'seo_description' => 'Review the terms and conditions that govern your use of the Kharidai e-commerce platform.',
                'is_published' => true,
                'show_in_nav' => false,
                'show_in_footer' => true,
                'sort_order' => 3,
            ],
            [
                'title' => 'Contact Us',
                'slug' => 'contact-us',
                'content' => '<h1>Contact Us</h1><p>We would love to hear from you! Whether you have a question about an order, a product inquiry, or just want to give feedback, our team is ready to help.</p><p><strong>Email:</strong> support@kharidai.com</p><p><strong>Phone:</strong> +977-1-4000000</p><p><strong>Address:</strong> Kathmandu, Bagmati, Nepal</p>',
                'seo_title' => 'Contact Us | Kharidai Support',
                'seo_description' => 'Get in touch with the Kharidai support team for any questions, concerns, or feedback regarding your shopping experience.',
                'is_published' => true,
                'show_in_nav' => true,
                'show_in_footer' => true,
                'sort_order' => 4,
            ],
            [
                'title' => 'Frequently Asked Questions',
                'slug' => 'faq',
                'content' => '<h1>Frequently Asked Questions (FAQ)</h1><h2>How do I track my order?</h2><p>Once your order has shipped, you will receive an email with a tracking number and a link to track your package.</p><h2>What is your return policy?</h2><p>We offer a 7-day return policy for most physical items. Digital products and services are generally non-refundable unless stated otherwise.</p><h2>Do you ship internationally?</h2><p>Currently, we only ship physical products within Nepal. Digital products and services are available globally.</p>',
                'seo_title' => 'FAQ | Kharidai Help Center',
                'seo_description' => 'Find answers to commonly asked questions about shipping, returns, and ordering on Kharidai.',
                'is_published' => true,
                'show_in_nav' => false,
                'show_in_footer' => true,
                'sort_order' => 5,
            ],
        ];

        foreach ($pages as $page) {
            Page::firstOrCreate(
                ['slug' => $page['slug']],
                array_merge($page, [
                    'published_at' => now()->subDays(rand(1, 30)),
                ])
            );
        }
    }
}

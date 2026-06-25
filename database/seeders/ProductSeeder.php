<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            [
                'title' => 'Codex from OpenAI',
                'description' => 'An AI system that translates natural language into code.',
                'variant_name' => 'Standard Access',
                'price_usd' => 20,
            ],
            [
                'title' => 'Claude Code by Anthropic',
                'description' => 'An AI assistant for coding tasks, powered by Anthropic\'s Claude models.',
                'variant_name' => 'Pro Access',
                'price_usd' => 20,
            ],
            [
                'title' => 'ChatGPT 1 Month',
                'description' => '1 Month subscription for ChatGPT Plus, offering access to advanced AI models.',
                'variant_name' => '1 Month Subscription',
                'price_usd' => 20,
            ],
            [
                'title' => 'Google One Pro | Gemini AI Pro | 5 TB | 18 Months',
                'description' => '18 Months of Google One Pro with Gemini AI Pro access and 5 TB of cloud storage.',
                'variant_name' => '18 Months Plan',
                'price_usd' => 150,
            ],
            [
                'title' => 'Zoom Pro',
                'description' => 'Zoom Pro subscription for unlimited meeting durations and premium video conferencing features.',
                'variant_name' => 'Pro Subscription',
                'price_usd' => 15,
            ],
            [
                'title' => 'Microsoft Onedrive | 1 TB',
                'description' => '1 TB of secure cloud storage from Microsoft OneDrive.',
                'variant_name' => '1 TB Storage',
                'price_usd' => 70,
            ],
            [
                'title' => 'Perplexity AI | Year',
                'description' => '1 Year subscription to Perplexity AI for an advanced, AI-powered search experience.',
                'variant_name' => 'Yearly Subscription',
                'price_usd' => 200,
            ],
            [
                'title' => 'Grammarly',
                'description' => 'Grammarly Premium subscription for real-time writing feedback and advanced grammar checks.',
                'variant_name' => 'Premium',
                'price_usd' => 144,
            ],
            [
                'title' => 'Quillbot Premium',
                'description' => 'Quillbot Premium for advanced paraphrasing, summarizing, and writing enhancements.',
                'variant_name' => 'Premium',
                'price_usd' => 100,
            ],
            [
                'title' => 'Jenni Ai',
                'description' => 'Jenni AI assistant for academic writing and research, powered by advanced language models.',
                'variant_name' => 'Pro Access',
                'price_usd' => 144,
            ],
            [
                'title' => 'Scribd Premium',
                'description' => 'Scribd Premium subscription for unlimited access to audiobooks, ebooks, and magazines.',
                'variant_name' => 'Premium Subscription',
                'price_usd' => 120,
            ],
            [
                'title' => 'Capcut Pro',
                'description' => 'Capcut Pro subscription for advanced video editing features, effects, and assets.',
                'variant_name' => 'Pro Version',
                'price_usd' => 90,
            ],
            [
                'title' => 'NordVPN',
                'description' => 'NordVPN subscription for secure, private, and unrestricted internet browsing.',
                'variant_name' => 'Standard VPN',
                'price_usd' => 84,
            ],
        ];

        foreach ($products as $data) {
            $product = Product::create([
                'title' => $data['title'],
                'description' => $data['description'],
                'image' => null,
            ]);

            $product->variants()->create([
                'name' => $data['variant_name'],
                'price_npr' => $data['price_usd'] * 135, // Approximate NPR conversion
                'price_usd' => $data['price_usd'],
            ]);
        }
    }
}

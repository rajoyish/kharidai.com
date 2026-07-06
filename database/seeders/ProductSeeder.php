<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('name');

        $products = [
            [
                'title' => 'Codex from OpenAI',
                'description' => 'An AI system that translates natural language into code.',
                'variant_name' => 'Standard Access',
                'price_npr' => 20 * 135,
                'category_id' => $categories->get('AI Subscriptions')?->id,
            ],
            [
                'title' => 'Claude Code by Anthropic',
                'description' => 'An AI assistant for coding tasks, powered by Anthropic\'s Claude models.',
                'variant_name' => 'Pro Access',
                'price_npr' => 20 * 135,
                'category_id' => $categories->get('AI Subscriptions')?->id,
            ],
            [
                'title' => 'ChatGPT 1 Month',
                'description' => '1 Month subscription for ChatGPT Plus, offering access to advanced AI models.',
                'variant_name' => '1 Month Subscription',
                'price_npr' => 20 * 135,
                'category_id' => $categories->get('AI Subscriptions')?->id,
            ],
            [
                'title' => 'Google One Pro | Gemini AI Pro | 5 TB | 18 Months',
                'description' => '18 Months of Google One Pro with Gemini AI Pro access and 5 TB of cloud storage.',
                'variant_name' => '18 Months Plan',
                'price_npr' => 150 * 135,
                'category_id' => $categories->get('Cloud Storage')?->id,
            ],
            [
                'title' => 'Zoom Pro',
                'description' => 'Zoom Pro subscription for unlimited meeting durations and premium video conferencing features.',
                'variant_name' => 'Pro Subscription',
                'price_npr' => 15 * 135,
                'category_id' => $categories->get('Productivity Software')?->id,
            ],
            [
                'title' => 'Microsoft Onedrive | 1 TB',
                'description' => '1 TB of secure cloud storage from Microsoft OneDrive.',
                'variant_name' => '1 TB Storage',
                'price_npr' => 70 * 135,
                'category_id' => $categories->get('Cloud Storage')?->id,
            ],
            [
                'title' => 'Perplexity AI | Year',
                'description' => '1 Year subscription to Perplexity AI for an advanced, AI-powered search experience.',
                'variant_name' => 'Yearly Subscription',
                'price_npr' => 200 * 135,
                'category_id' => $categories->get('AI Subscriptions')?->id,
            ],
            [
                'title' => 'Grammarly',
                'description' => 'Grammarly Premium subscription for real-time writing feedback and advanced grammar checks.',
                'variant_name' => 'Premium',
                'price_npr' => 144 * 135,
                'category_id' => $categories->get('Productivity Software')?->id,
            ],
            [
                'title' => 'Quillbot Premium',
                'description' => 'Quillbot Premium for advanced paraphrasing, summarizing, and writing enhancements.',
                'variant_name' => 'Premium',
                'price_npr' => 100 * 135,
                'category_id' => $categories->get('Productivity Software')?->id,
            ],
            [
                'title' => 'Jenni Ai',
                'description' => 'Jenni AI assistant for academic writing and research, powered by advanced language models.',
                'variant_name' => 'Pro Access',
                'price_npr' => 144 * 135,
                'category_id' => $categories->get('AI Subscriptions')?->id,
            ],
            [
                'title' => 'Scribd Premium',
                'description' => 'Scribd Premium subscription for unlimited access to audiobooks, ebooks, and magazines.',
                'variant_name' => 'Premium Subscription',
                'price_npr' => 120 * 135,
                'category_id' => $categories->get('Productivity Software')?->id,
            ],
            [
                'title' => 'Capcut Pro',
                'description' => 'Capcut Pro subscription for advanced video editing features, effects, and assets.',
                'variant_name' => 'Pro Version',
                'price_npr' => 90 * 135,
                'category_id' => $categories->get('Creative Tools')?->id,
            ],
            [
                'title' => 'NordVPN',
                'description' => 'NordVPN subscription for secure, private, and unrestricted internet browsing.',
                'variant_name' => 'Standard VPN',
                'price_npr' => 84 * 135,
                'category_id' => $categories->get('VPN Services')?->id,
            ],
        ];

        foreach ($products as $data) {
            $product = Product::create([
                'title' => $data['title'],
                'description' => $data['description'],
                'image' => null,
            ]);

            $product->categories()->sync(array_filter([$data['category_id']]));

            $product->variants()->create([
                'name' => $data['variant_name'].' (Basic)',
                'price_npr' => $data['price_npr'] * 0.8,
            ]);

            $product->variants()->create([
                'name' => $data['variant_name'],
                'price_npr' => $data['price_npr'],
            ]);

            $product->variants()->create([
                'name' => $data['variant_name'].' (Premium)',
                'price_npr' => $data['price_npr'] * 1.5,
            ]);
        }
    }
}

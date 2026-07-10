<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('is_admin', true)->first();
        if (! $admin) {
            return;
        }

        $posts = [
            [
                'title' => 'Top 5 Tech Gadgets of 2026',
                'slug' => 'top-5-tech-gadgets-2026',
                'excerpt' => 'Discover the most innovative and must-have technology products released this year.',
                'content' => '<p>The tech industry moves fast, and 2026 has brought some incredible new gadgets to the market. From AI-powered wearables to next-generation smart home devices, here are our top 5 picks that you need to check out.</p><h2>1. Neural Interfaces</h2><p>Controlling your devices with just your thoughts is no longer science fiction. The latest generation of consumer neural interfaces offers seamless integration with your smartphone and PC.</p><h2>2. Holographic Displays</h2><p>Desk setups have been revolutionized by desktop holographic projectors. No more flat screens; 3D modeling and entertainment are now truly immersive.</p>',
                'seo_title' => 'Top 5 Tech Gadgets of 2026 | Kharidai Blog',
                'seo_description' => 'Explore our curated list of the top 5 must-have tech gadgets of 2026, featuring AI wearables and holographic displays.',
            ],
            [
                'title' => 'How to Choose the Perfect Freelance Designer',
                'slug' => 'how-to-choose-freelance-designer',
                'excerpt' => 'A comprehensive guide to finding, vetting, and hiring the right designer for your next project.',
                'content' => '<p>Finding the right designer can make or break your brand\'s visual identity. Whether you need a logo, a complete website overhaul, or just some marketing materials, the process of hiring a freelancer requires careful consideration.</p><h2>Reviewing Portfolios</h2><p>Always look for consistency and versatility. A great designer will have a portfolio that demonstrates their ability to adapt to different brand voices while maintaining high quality.</p><h2>Communication is Key</h2><p>Before signing any contracts, have a detailed discussion about your brief. Pay attention to how well they listen and the questions they ask about your project goals.</p>',
                'seo_title' => 'Hiring a Freelance Designer: A Complete Guide',
                'seo_description' => 'Learn the best practices for finding and hiring a freelance designer, from reviewing portfolios to communicating your brief effectively.',
            ],
            [
                'title' => 'Sustainable Fashion: Why It Matters',
                'slug' => 'sustainable-fashion-why-it-matters',
                'excerpt' => 'Understanding the environmental impact of fast fashion and how to make better clothing choices.',
                'content' => '<p>The fashion industry is one of the largest polluters globally. As consumers, our purchasing choices have a direct impact on the environment. It\'s time to shift our focus towards sustainable fashion.</p><h2>What is Sustainable Fashion?</h2><p>Sustainable fashion refers to clothing that is designed, manufactured, distributed, and used in ways that are environmentally friendly.</p><h2>How You Can Help</h2><p>Start by buying fewer, higher-quality items that will last longer. Look for brands that prioritize ethical labor practices and use recycled or organic materials.</p>',
                'seo_title' => 'The Importance of Sustainable Fashion | Kharidai Blog',
                'seo_description' => 'Discover why sustainable fashion matters and learn how you can make more eco-friendly choices when shopping for clothes.',
            ],
            [
                'title' => 'Maximizing Productivity with AI Tools',
                'slug' => 'maximizing-productivity-ai-tools',
                'excerpt' => 'Learn how integrating AI subscriptions into your workflow can save you hours every week.',
                'content' => '<p>Artificial Intelligence is no longer just a buzzword; it is a practical tool that can significantly enhance your daily productivity. Here is how you can leverage AI subscriptions to get more done in less time.</p><h2>Automated Writing and Coding</h2><p>Tools like ChatGPT and Claude can help draft emails, generate reports, and even write boilerplate code. This frees up your time to focus on high-level strategy and creative problem-solving.</p><h2>Smart Scheduling</h2><p>AI assistants can analyze your calendar and habits to suggest the optimal times for deep work versus meetings, ensuring you maintain a healthy and productive routine.</p>',
                'seo_title' => 'Boost Your Productivity Using AI Tools',
                'seo_description' => 'Find out how AI subscriptions like ChatGPT and Claude can automate tasks and drastically improve your daily productivity.',
            ],
        ];

        foreach ($posts as $post) {
            Post::firstOrCreate(
                ['slug' => $post['slug']],
                array_merge($post, [
                    'user_id' => $admin->id,
                    'is_published' => true,
                    'published_at' => now()->subDays(rand(1, 40)),
                ])
            );
        }
    }
}

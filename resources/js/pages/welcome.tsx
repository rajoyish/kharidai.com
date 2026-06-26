import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { ShoppingBag, Sparkles, Archive, CloudDownload, Star, Briefcase, Truck, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Product = {
    id: number;
    title: string;
    description: string;
    image: string;
    variants: Variant[];
};

type Variant = {
    id: number;
    name: string;
    price_npr: string;
    price_usd: string;
};

export default function Welcome({
    uncategorizedProducts,
    categories,
}: {
    uncategorizedProducts: Product[];
    categories: { id: number; name: string; slug: string; products: Product[] }[];
}) {
    const { auth, cartCount } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const { filteredCategories, filteredUncategorizedProducts } = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        let cats = categories;
        let uncategorized = uncategorizedProducts;

        // Filter by selected category dropdown
        if (selectedCategory !== 'all') {
            cats = cats.filter(c => c.id.toString() === selectedCategory);
            uncategorized = []; // If a specific category is selected, uncategorized products are hidden
        }

        // Filter by search query
        if (query) {
            cats = cats.map(category => ({
                ...category,
                products: category.products.filter(p =>
                    p.title.toLowerCase().includes(query) ||
                    (p.description && p.description.toLowerCase().includes(query))
                )
            })).filter(category => category.products.length > 0);

            uncategorized = uncategorized.filter(p =>
                p.title.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        return { filteredCategories: cats, filteredUncategorizedProducts: uncategorized };
    }, [categories, uncategorizedProducts, searchQuery, selectedCategory]);

    const scrollToShop = () => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <>
            <Head title="Kharidai - Your all-in-one marketplace!" />
            <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-foreground">

                {/* Hero Wrapper with Gradient */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-accent/10 pb-32 pt-4">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>

                    <header className="relative z-10 container mx-auto flex items-center justify-between px-6 py-4">
                        <Link href="/" className="flex items-center gap-3 group">
                            <img src="/images/logo.webp" alt="Kharidai" className="h-9 transition-transform group-hover:scale-105" />
                            <span className="sr-only">Kharidai</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-700">
                            <button onClick={scrollToShop} className="hover:text-black transition-colors font-semibold">How It Works</button>
                            <button onClick={scrollToShop} className="hover:text-black transition-colors font-semibold">Products</button>
                            <Link href="/" className="hover:text-black transition-colors font-semibold">About</Link>
                        </nav>

                        <div className="flex items-center gap-4">
                            <Link
                                href="/cart"
                                className="text-sm font-semibold text-gray-700 hover:text-black transition-colors flex items-center"
                            >
                                Cart
                                {(cartCount as number) > 0 && (
                                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm">
                                        {cartCount as number}
                                    </span>
                                )}
                            </Link>
                            {auth.user ? (
                                <Link
                                    href={auth.user.is_admin ? '/admin' : '/orders'}
                                    className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                                >
                                    {auth.user.is_admin ? 'Admin' : 'Dashboard'}
                                </Link>
                            ) : (
                                <>
                                    <a href="/auth/google" className="hidden sm:block text-sm font-semibold text-gray-700 hover:text-black transition-colors">
                                        Log In
                                    </a>
                                    <a
                                        href="/auth/google"
                                        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                                    >
                                        Get Started
                                    </a>
                                </>
                            )}
                        </div>
                    </header>

                    <div className="relative z-10 container mx-auto mt-20 px-4 text-center max-w-4xl">
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#1A1A1A] leading-[1.1] mb-6">
                            Your all-in-one<br />marketplace!
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-10">
                            Discover digital goods, premium subscriptions, trusted services, and physical products—all at unbeatable prices. Shop smart. Shop reliable.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={scrollToShop} className="rounded-full bg-primary px-8 py-3.5 text-sm font-semibold text-white hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                Start Here
                            </button>
                        </div>
                    </div>

                    {/* Floating Cards Graphic */}
                    <div className="relative z-10 mt-20 flex justify-center max-w-5xl mx-auto px-4 h-64 md:h-80 perspective-1000">
                        {/* Center Card */}
                        <div className="absolute z-30 w-72 bg-white p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-gray-100 transform -translate-y-4 transition-all duration-500 ease-out hover:-translate-y-8 hover:scale-105 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] hover:z-50 cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 mx-auto shadow-inner"><ShoppingBag className="w-5 h-5" /></div>
                            <h3 className="text-center text-xl text-gray-900 leading-snug mb-3">Find exactly what you need, instantly.</h3>
                            <div className="flex justify-center items-center gap-3 text-xs font-medium text-gray-400 mt-6">
                                <span>10k+ items</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                <span>24/7 delivery</span>
                            </div>
                        </div>
                        {/* Left Card */}
                        <div className="absolute z-20 w-64 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)] border border-gray-100 transform -rotate-[8deg] -translate-x-32 md:-translate-x-56 translate-y-12 transition-all duration-500 ease-out hover:rotate-0 hover:translate-y-0 hover:scale-110 hover:z-50 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center mb-4 mx-auto shadow-inner"><Sparkles className="w-4 h-4" /></div>
                            <h3 className="text-center text-lg text-gray-800 leading-snug">Premium Subscriptions</h3>
                        </div>
                        {/* Right Card */}
                        <div className="absolute z-20 w-64 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)] border border-gray-100 transform rotate-[8deg] translate-x-32 md:translate-x-56 translate-y-12 transition-all duration-500 ease-out hover:rotate-0 hover:translate-y-0 hover:scale-110 hover:z-50 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4 mx-auto shadow-inner"><Archive className="w-4 h-4" /></div>
                            <h3 className="text-center text-lg text-gray-800 leading-snug">Trusted Physical Goods</h3>
                        </div>
                    </div>
                </div>

                <div className="py-32 relative overflow-hidden bg-[#09090b]">
                    {/* Mesh Gradient Orbs */}
                    <div className="absolute top-0 left-1/4 w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[128px] pointer-events-none mix-blend-screen transform -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-1/4 w-[40rem] h-[40rem] bg-accent/20 rounded-full blur-[128px] pointer-events-none mix-blend-screen transform translate-y-1/3"></div>
                    <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-[128px] pointer-events-none mix-blend-screen transform -translate-x-1/2 -translate-y-1/2"></div>

                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div className="container mx-auto px-4 max-w-5xl relative z-10">
                        <div className="text-center mb-20">
                            <h2 className="text-4xl text-white mb-4">A path to better shopping</h2>
                            <p className="text-gray-400 text-lg">Kharidai helps you discover the best products without the hassle.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white/[0.03] backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 relative overflow-hidden group shadow-2xl">
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/30 transition-colors pointer-events-none"></div>
                                <CloudDownload className="w-8 h-8 text-accent mb-4 relative z-10" />
                                <h3 className="text-2xl text-white mb-3 relative z-10">Digital Goods</h3>
                                <p className="text-gray-400 leading-relaxed relative z-10">Instant access to software, game keys, and digital content. Delivered directly to your email within seconds.</p>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 relative overflow-hidden group shadow-2xl">
                                <div className="absolute -top-12 -left-12 w-40 h-40 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors pointer-events-none"></div>
                                <Star className="w-8 h-8 text-primary mb-4 relative z-10" />
                                <h3 className="text-2xl text-white mb-3 relative z-10">Premium Subscriptions</h3>
                                <p className="text-gray-400 leading-relaxed relative z-10">Unlock premium features on your favorite platforms at unbeatable discounted rates.</p>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 relative overflow-hidden group shadow-2xl">
                                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/30 transition-colors pointer-events-none"></div>
                                <Briefcase className="w-8 h-8 text-accent mb-4 relative z-10" />
                                <h3 className="text-2xl text-white mb-3 relative z-10">Trusted Services</h3>
                                <p className="text-gray-400 leading-relaxed relative z-10">Hire top-rated professionals for freelance work, consulting, and specialized services.</p>
                            </div>
                            <div className="bg-white/[0.03] backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 relative overflow-hidden group shadow-2xl">
                                <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-colors pointer-events-none"></div>
                                <Truck className="w-8 h-8 text-primary mb-4 relative z-10" />
                                <h3 className="text-2xl text-white mb-3 relative z-10">Physical Products</h3>
                                <p className="text-gray-400 leading-relaxed relative z-10">Shop for electronics, gadgets, and everyday essentials with fast, reliable shipping to your door.</p>
                            </div>
                        </div>


                    </div>
                </div>

                {/* Shop Section */}
                <main id="shop" className="container mx-auto flex-1 px-4 py-24 max-w-7xl">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl text-[#1A1A1A] mb-4">Explore Our Catalog</h2>
                        <p className="text-gray-500">Find the best deals across all categories.</p>
                    </div>

                    {/* Search and Filter */}
                    <div className="mb-16 flex flex-col sm:flex-row gap-4 items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <Input
                            type="search"
                            placeholder="Search products by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 h-12 text-base border-gray-200 focus-visible:ring-accent rounded-xl bg-gray-50/50"
                        />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="flex h-12 w-full sm:w-64 items-center justify-between whitespace-nowrap rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 font-medium text-gray-700"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category.id} value={category.id.toString()}>{category.name}</option>
                            ))}
                        </select>
                    </div>

                    {filteredCategories.map((category) => (
                        category.products && category.products.length > 0 && (
                            <div key={category.id} className="mb-16">
                                <h2 className="mb-8 text-2xl text-gray-900 border-b border-gray-100 pb-4">
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3">
                                    {category.products.map((product) => (
                                        <Link
                                            key={product.id}
                                            href={`/products/${product.id}`}
                                            className="group relative rounded-2xl border border-gray-100 bg-white p-5 text-card-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 block"
                                        >
                                            <div className="mb-5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50">
                                                {product.image ? (
                                                    <img
                                                        src={`/storage/${product.image}`}
                                                        alt={product.title}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                        No image
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-lg text-gray-900 leading-tight mb-2">
                                                {product.title}
                                            </h3>
                                            {product.variants &&
                                                product.variants.length > 0 && (
                                                    <div className="text-sm font-medium text-primary">
                                                        Starting at Rs.{' '}
                                                        {product.variants[0].price_npr} / $
                                                        {product.variants[0].price_usd}
                                                    </div>
                                                )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}

                    {filteredUncategorizedProducts && filteredUncategorizedProducts.length > 0 && (
                        <div className="mb-16">
                            <h2 className="mb-8 text-2xl text-gray-900 border-b border-gray-100 pb-4">
                                Other Products
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3">
                                {filteredUncategorizedProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}`}
                                        className="group relative rounded-2xl border border-gray-100 bg-white p-5 text-card-foreground transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 block"
                                    >
                                        <div className="mb-5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-50">
                                            {product.image ? (
                                                <img
                                                    src={`/storage/${product.image}`}
                                                    alt={product.title}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                                    No image
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-lg text-gray-900 leading-tight mb-2">
                                            {product.title}
                                        </h3>
                                        {product.variants &&
                                            product.variants.length > 0 && (
                                                <div className="text-sm font-medium text-primary">
                                                    Starting at Rs.{' '}
                                                    {product.variants[0].price_npr} / $
                                                    {product.variants[0].price_usd}
                                                </div>
                                            )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {filteredCategories.length === 0 && (!filteredUncategorizedProducts || filteredUncategorizedProducts.length === 0) && (
                        <div className="mt-20 text-center bg-gray-50 rounded-2xl p-12 border border-gray-100">
                            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl text-gray-900 mb-2">No products found</h3>
                            <p className="text-gray-500">We couldn't find any products matching your current filters.</p>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

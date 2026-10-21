#include <iostream>
#include <vector>

using namespace std;

void solve() {
    int n, q;
    if (!(cin >> n >> q)) return;

    vector<long long> pref(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        long long val;
        cin >> val;
        pref[i] = pref[i - 1] + val;
    }

    for (int j = 0; j < q; j++) {
        int l, r;
        cin >> l >> r;
        cout << (pref[r] - pref[l - 1]) << "\n";
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t;
    if (cin >> t) {
        while (t--) {
            solve();
        }
    }
    return 0;
}

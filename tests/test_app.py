import unittest
import sambatube


class SambaTubeTestCase(unittest.TestCase):
    """ SambaTube: Views """

    def setUp(self):
        self.app = sambatube.app.test_client()

    def test_index(self):
        """ SambaTube: Index is acessible """

        request = self.app.get('/')
        self.assertEquals(request.status_code, 200)

    def tearDown(self):
        pass

if __name__ == '__main__':
    unittest.main()
